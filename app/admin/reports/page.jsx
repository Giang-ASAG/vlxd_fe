"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfQuarter, endOfYear, format, isAfter, isBefore, startOfDay, endOfDay, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Download, RefreshCw, Search, TrendingUp, DollarSign, Calendar as CalendarIcon2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ThongKeService } from "@/src/services/api-services";

const CURRENCY_OPTIONS = ["VND"];
const ROW_HEIGHT = 40;
const OVERSCAN = 8;

const TEMPLATE = [
  {
    id: "income",
    name: "Báo cáo kết quả kinh doanh",
    section: "income",
    total: true,
    children: [
      { id: "revenue", name: "Doanh thu bán hàng", section: "income", base: 540000000 },
      { id: "cogs", name: "Giá vốn hàng bán", section: "income", base: -340000000 },
      { id: "shipping", name: "Chi phí vận chuyển", section: "income", base: -25000000 },
      { id: "salary", name: "Chi phí lương", section: "income", base: -60000000 },
      { id: "other_expenses", name: "Chi phí khác", section: "income", base: -13000000 },
      { id: "profit", name: "Tổng lợi nhuận", section: "income", total: true, formula: ["revenue", "cogs", "shipping", "salary", "other_expenses"] },
    ],
  },
];

const dateKey = (d) => format(d, "yyyy-MM-dd");

function seededFactor(seedText, i) {
  let h = 0;
  for (let j = 0; j < seedText.length; j += 1) {
    h = (h * 31 + seedText.charCodeAt(j) + i) % 10007;
  }
  return 0.85 + (h % 35) / 100;
}

function buildPeriods(from, to, groupBy) {
  const periods = [];
  let cursor = startOfDay(new Date(from));
  const end = endOfDay(new Date(to));

  if (groupBy === "day") {
    while (!isAfter(cursor, end)) {
      periods.push({ key: dateKey(cursor), label: format(cursor, "dd/MM/yyyy") });
      cursor = addDays(cursor, 1);
    }
    return periods;
  }

  if (groupBy === "month") {
    cursor = startOfMonth(cursor);
    while (!isAfter(cursor, end)) {
      periods.push({ key: format(cursor, "yyyy-MM"), label: format(cursor, "MM/yyyy") });
      cursor = addMonths(cursor, 1);
    }
    return periods;
  }

  if (groupBy === "quarter") {
    cursor = startOfQuarter(cursor);
    while (!isAfter(cursor, end)) {
      periods.push({ key: `Q${Math.floor(cursor.getMonth() / 3) + 1} ${cursor.getFullYear()}`, label: `Q${Math.floor(cursor.getMonth() / 3) + 1}/${cursor.getFullYear()}` });
      cursor = addMonths(cursor, 3);
    }
    return periods;
  }

  cursor = startOfYear(cursor);
  while (!isAfter(cursor, end)) {
    periods.push({ key: String(cursor.getFullYear()), label: String(cursor.getFullYear()) });
    cursor = addMonths(cursor, 12);
  }
  return periods;
}

function calculateLeafValues(node, periods, groupBy) {
  if (!node.base) return {};
  let factor = 1;
  if(groupBy === "day") factor = 1 / 30;
  if(groupBy === "quarter") factor = 3;
  if(groupBy === "year") factor = 12;

  return periods.reduce((acc, p, i) => {
    acc[p.key] = Math.round(node.base * factor * seededFactor(node.id + p.key, i));
    return acc;
  }, {});
}

function computeFormulas(index, periods, formula) {
  return periods.reduce((acc, p) => {
    acc[p.key] = formula.reduce((sum, sourceId) => sum + (index[sourceId]?.[p.key] ?? 0), 0);
    return acc;
  }, {});
}

async function fetchFinancialReport({ from, to, groupBy }) {
  const dau = dateKey(from);
  const cuoi = dateKey(to);
  const res = await ThongKeService.baoCaoTaiChinh({ dau, cuoi, groupBy });
  if (!res?.success) {
    throw new Error(res?.error || "Không thể tải báo cáo tài chính");
  }
  return res.data ?? { columns: [], rows: [] };
}

function flattenRows(rows, expanded, level = 0) {
  return rows.flatMap((row) => {
    const current = [{ ...row, level }];
    if (!row.children || !expanded[row.id]) return current;
    return [...current, ...flattenRows(row.children, expanded, level + 1)];
  });
}

function sortTree(rows, sortKey, direction) {
  if (!sortKey) return rows;
  const sign = direction === "asc" ? 1 : -1;
  return rows.map((row) => {
    if (!row.children) return row;
    const children = [...row.children].sort((a, b) => ((a.values?.[sortKey] ?? 0) - (b.values?.[sortKey] ?? 0)) * sign);
    return { ...row, children: sortTree(children, sortKey, direction) };
  });
}

function filterTree(rows, search) {
  const s = search.trim().toLowerCase();
  return rows
    .map((row) => {
      if (!row.children) return row;
      const children = row.children.filter((c) => c.name.toLowerCase().includes(s) || !s);
      if (row.name.toLowerCase().includes(s) || children.length > 0 || !s) return { ...row, children };
      return null;
    })
    .filter(Boolean);
}

export default function FinancialReportPage() {
  const today = new Date();
  const [range, setRange] = useState({ from: startOfMonth(today), to: today });
  const [groupBy, setGroupBy] = useState("month");
  const [currency, setCurrency] = useState("VND");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState({ key: "", dir: "desc" });
  const [expanded, setExpanded] = useState({ income: true });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ columns: [], rows: [] });
  const [hovered, setHovered] = useState({ row: "", col: "" });
  const [refreshTick, setRefreshTick] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const tableContainerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const debounceRef = useRef(null);

  const rangeSummary = useMemo(() => {
    if (!range.from || !range.to) return "Chọn khoảng thời gian";
    return `${format(range.from, "dd MMM yyyy")} - ${format(range.to, "dd MMM yyyy")}`;
  }, [range]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    if (isAfter(range.from, range.to)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const key = `${dateKey(range.from)}|${dateKey(range.to)}|${groupBy}`;
      if (cacheRef.current.has(key)) {
        setData(cacheRef.current.get(key));
        return;
      }
      setLoading(true);
      try {
        const next = await fetchFinancialReport({ from: range.from, to: range.to, groupBy });
        cacheRef.current.set(key, next);
        setData(next);
      } catch (err) {
        console.error(err);
        setData({ columns: [], rows: [] });
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [range, groupBy, refreshTick]);

  const filteredRows = useMemo(
    () => sortTree(filterTree(data.rows, search), sortState.key, sortState.dir),
    [data.rows, search, sortState]
  );
  const flatRows = useMemo(() => flattenRows(filteredRows, expanded), [filteredRows, expanded]);

  const viewportHeight = 560;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const visibleRows = flatRows.slice(startIndex, startIndex + visibleCount);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (flatRows.length - startIndex - visibleRows.length) * ROW_HEIGHT);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [currency]
  );

  const setPreset = (preset) => {
    if (preset === "today") setRange({ from: today, to: today });
    if (preset === "month") setRange({ from: startOfMonth(today), to: endOfMonth(today) });
    if (preset === "quarter") setRange({ from: startOfQuarter(today), to: endOfQuarter(today) });
    if (preset === "year") setRange({ from: startOfYear(today), to: endOfYear(today) });
  };

  const onRangeSelect = (nextRange) => {
    if (!nextRange?.from) return;
    const nextTo = nextRange.to ?? nextRange.from;
    if (isAfter(nextTo, today)) return;
    if (isBefore(nextTo, nextRange.from)) return;
    setRange({ from: nextRange.from, to: nextTo });
  };

  const handleSort = (colKey) => {
    setSortState((prev) => {
      if (prev.key !== colKey) return { key: colKey, dir: "desc" };
      return { key: colKey, dir: prev.dir === "desc" ? "asc" : "desc" };
    });
  };

  const exportExcel = async () => {
    if (!range.from || !range.to) return;

    const periodText = `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;
    const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");
    const numberFormat = currency === "VND" ? "#,##0;[Red]-#,##0" : "#,##0.00;[Red]-#,##0.00";

    const groupLabel = (g) => (g === "day" ? "Ngày" : g === "month" ? "Tháng" : g === "quarter" ? "Quý" : "Năm");
    const sheetName = (g) => `Theo ${groupLabel(g).toLowerCase()}`;
    const tableName = (g) => `Tbl_${g}`;

    const flattenAllRows = (rows, level = 0) =>
      rows.flatMap((row) => {
        const current = [{ ...row, level }];
        if (!row.children) return current;
        return [...current, ...flattenAllRows(row.children, level + 1)];
      });

    const buildTableRows = (report) => {
      const all = flattenAllRows(report.rows);
      return all.map((row) => [
        `${"  ".repeat(row.level)}${row.name}`,
        ...report.columns.map((c) => row.values?.[c.key] ?? 0),
      ]);
    };

    const buildDataRows = (groupByKey, report) => {
      const all = flattenAllRows(report.rows);
      const out = [];
      for (const row of all) {
        for (const col of report.columns) {
          out.push([
            groupByKey,
            col.key,
            col.label,
            row.id,
            row.name,
            row.level,
            row.values?.[col.key] ?? 0,
          ]);
        }
      }
      return out;
    };

    const [dayReport, monthReport, quarterReport, yearReport] = await Promise.all([
      fetchFinancialReport({ from: range.from, to: range.to, groupBy: "day" }),
      fetchFinancialReport({ from: range.from, to: range.to, groupBy: "month" }),
      fetchFinancialReport({ from: range.from, to: range.to, groupBy: "quarter" }),
      fetchFinancialReport({ from: range.from, to: range.to, groupBy: "year" }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "BuildMart";
    wb.created = new Date();
    wb.modified = new Date();
    wb.properties = { title: "Báo cáo tài chính", subject: "Financial report" };

    const addReportSheet = (groupByKey, report) => {
      const ws = wb.addWorksheet(sheetName(groupByKey), { views: [{ state: "frozen", xSplit: 0, ySplit: 5, rightToLeft: false }] });

      const totalCols = 1 + report.columns.length;
      ws.getCell("A1").value = "BÁO CÁO TÀI CHÍNH";
      ws.getCell("A2").value = `Kỳ báo cáo: ${periodText}`;
      ws.getCell("A3").value = `Xem theo: ${groupLabel(groupByKey)} | Đơn vị tiền tệ: ${currency} | Xuất lúc: ${generatedAt}`;

      ws.mergeCells(1, 1, 1, totalCols);
      ws.mergeCells(2, 1, 2, totalCols);
      ws.mergeCells(3, 1, 3, totalCols);

      ws.getRow(1).height = 24;
      ws.getCell("A1").font = { bold: true, size: 16 };
      ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      ws.getCell("A2").font = { bold: true };
      ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      ws.getRow(4).height = 6;

      const titleAlignment = { horizontal: "center", vertical: "middle", wrapText: true };
      for (let r = 1; r <= 3; r += 1) {
        for (let c = 1; c <= totalCols; c += 1) {
          ws.getCell(r, c).alignment = titleAlignment;
        }
      }

      const columns = [
        { name: "Chỉ tiêu" },
        ...report.columns.map((c) => ({ name: c.label })),
      ];

      ws.addTable({
        name: tableName(groupByKey),
        ref: "A5",
        headerRow: true,
        totalsRow: false,
        style: { theme: "TableStyleMedium9", showRowStripes: true },
        columns,
        rows: buildTableRows(report),
      });

      ws.getColumn(1).width = 48;
      for (let c = 2; c <= totalCols; c += 1) {
        ws.getColumn(c).width = 16;
        ws.getColumn(c).numFmt = numberFormat;
      }
      const startRow = 6;
      const endRow = ws.rowCount;
      
      for (let r = startRow; r <= endRow; r++) {
        ws.getCell(r, 1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      
        for (let c = 2; c <= totalCols; c++) {
          ws.getCell(r, c).alignment = {
            horizontal: "right",
            vertical: "middle",
          };
        }
      }
      ws.getRow(5).height = 20;
      ws.getRow(5).alignment = { vertical: "middle" };
      return ws;
    };

    const dash = wb.addWorksheet("Dashboard", { views: [{ state: "frozen", ySplit: 1 }] });
    dash.getCell("A1").value = "Báo cáo tài chính (Excel)";
    dash.getCell("A1").font = { bold: true, size: 14 };
    dash.getColumn(1).width = 60;

    const link = (row, text, target) => {
      const cell = dash.getCell(`A${row}`);
      cell.value = { text, hyperlink: `#'${target}'!A1` };
      cell.font = { color: { argb: "FF1D4ED8" }, underline: true };
    };
    link(3, "Xem theo ngày", sheetName("day"));
    link(4, "Xem theo tháng", sheetName("month"));
    link(5, "Xem theo quý", sheetName("quarter"));
    link(6, "Xem theo năm", sheetName("year"));
    
    addReportSheet("day", dayReport);
    addReportSheet("month", monthReport);
    addReportSheet("quarter", quarterReport);
    addReportSheet("year", yearReport);

    const dataWs = wb.addWorksheet("Data", { views: [{ state: "frozen", ySplit: 1 }] });
    dataWs.getColumn(1).width = 10;
    dataWs.getColumn(2).width = 18;
    dataWs.getColumn(3).width = 14;
    dataWs.getColumn(4).width = 18;
    dataWs.getColumn(5).width = 42;
    dataWs.getColumn(6).width = 8;
    dataWs.getColumn(7).width = 16;
    dataWs.getColumn(7).numFmt = numberFormat;

    dataWs.addTable({
      name: "Tbl_Data",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "GroupBy" },
        { name: "PeriodKey" },
        { name: "PeriodLabel" },
        { name: "RowId" },
        { name: "RowName" },
        { name: "Level" },
        { name: "Value" },
      ],
      rows: [
        ...buildDataRows("day", dayReport),
        ...buildDataRows("month", monthReport),
        ...buildDataRows("quarter", quarterReport),
        ...buildDataRows("year", yearReport),
      ],
    });

    const safeFrom = dateKey(range.from);
    const safeTo = dateKey(range.to);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `bao_cao_tai_chinh_${safeFrom}_${safeTo}.xlsx`
    );
  };

  // Tính toán tổng doanh thu và lợi nhuận cho cards thống kê
  const revenueRow = data.rows.find(r => r.id === "revenue");
  const profitRow = data.rows.find(r => r.id === "profit");
  const totalRevenue = revenueRow?.values?.[data.columns[data.columns.length - 1]?.key] ?? 0;
  const totalProfit = profitRow?.values?.[data.columns[data.columns.length - 1]?.key] ?? 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Báo cáo tài chính</h1>
          <p className="text-sm text-muted-foreground">Phân tích kết quả kinh doanh theo từng kỳ</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: TrendingUp, label: "Tổng doanh thu", value: numberFormatter.format(totalRevenue), bg: "bg-primary/10", color: "text-primary" },
          { icon: DollarSign, label: "Tổng lợi nhuận", value: numberFormatter.format(totalProfit), bg: totalProfit >= 0 ? "bg-emerald-100" : "bg-destructive/10", color: totalProfit >= 0 ? "text-emerald-700" : "text-destructive" },
          { icon: CalendarIcon2, label: "Kỳ báo cáo", value: rangeSummary, bg: "bg-muted", color: "text-muted-foreground" },
        ].map(({ icon: Icon, label, value, bg, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", bg)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold truncate">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card className="border shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Tìm kiếm chỉ tiêu..." 
                className="pl-9 h-10" 
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-10">
                  <CalendarIcon className="h-4 w-4" />
                  {rangeSummary}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar 
                  mode="range" 
                  selected={range} 
                  onSelect={onRangeSelect} 
                  numberOfMonths={2} 
                  disabled={{ after: today }} 
                />
              </PopoverContent>
            </Popover>

            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPreset("today")} className="h-10">Hôm nay</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("month")} className="h-10">Tháng này</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("quarter")} className="h-10">Quý này</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("year")} className="h-10">Năm nay</Button>
            </div>

            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[130px] h-10">
                <SelectValue placeholder="Nhóm theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[110px] h-10">
                <SelectValue placeholder="Tiền tệ" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setRefreshTick((v) => v + 1)} className="gap-2 h-10">
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>

            <Button onClick={exportExcel} className="gap-2 h-10 ml-auto">
              <Download className="h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={tableContainerRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className="max-h-[560px] overflow-auto"
          >
            <table className="w-max min-w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="sticky left-0 z-30 min-w-[320px] border-r bg-muted/95 px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Chỉ tiêu
                  </th>
                  {data.columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "min-w-[140px] cursor-pointer border-r px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/80",
                        hovered.col === col.key && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>{col.label}</span>
                        {sortState.key === col.key && (
                          <span className="text-xs">{sortState.dir === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSpacer > 0 && (
                  <tr>
                    <td colSpan={data.columns.length + 1} style={{ height: topSpacer }} />
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={data.columns.length + 1} className="p-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Đang tải báo cáo...</span>
                      </div>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={data.columns.length + 1} className="p-12 text-center text-muted-foreground">
                      Không có dữ liệu báo cáo
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, idx) => {
                    const rowKey = `${row.id}-${idx}`;
                    const isEven = (startIndex + idx) % 2 === 0;
                    return (
                      <tr
                        key={rowKey}
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={() => setHovered((h) => ({ ...h, row: row.id }))}
                        onMouseLeave={() => setHovered((h) => ({ ...h, row: h.row === row.id ? "" : h.row }))}
                        className={cn(
                          "border-b transition-colors",
                          isEven ? "bg-background" : "bg-muted/30",
                          hovered.row === row.id && "bg-primary/5"
                        )}
                      >
                        <td
                          className={cn(
                            "sticky left-0 z-10 border-r px-4 py-2",
                            row.total && "font-semibold bg-inherit",
                            hovered.row === row.id && "ring-1 ring-inset ring-primary/20"
                          )}
                          style={{ backgroundColor: isEven ? "var(--background)" : "var(--muted)" }}
                        >
                          <div className="flex items-center gap-2" style={{ paddingLeft: (row.level || 0) * 16 }}>
                            {row.children ? (
                              <button
                                type="button"
                                onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                                className="rounded p-0.5 hover:bg-muted transition-colors"
                              >
                                {expanded[row.id] ? 
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                }
                              </button>
                            ) : (
                              <span className="h-4 w-4" />
                            )}
                            <span className={cn(row.total && "font-bold")}>{row.name}</span>
                          </div>
                        </td>
                        {data.columns.map((col) => {
                          const value = row.values?.[col.key] ?? 0;
                          return (
                            <td
                              key={col.key}
                              onMouseEnter={() => setHovered((h) => ({ ...h, col: col.key }))}
                              onMouseLeave={() => setHovered((h) => ({ ...h, col: "" }))}
                              className={cn(
                                "border-r px-4 py-2 text-right font-mono tabular-nums transition-colors",
                                value < 0 ? "text-red-600" : "text-foreground",
                                row.total && "font-semibold",
                                (hovered.col === col.key || hovered.row === row.id) && "bg-primary/5"
                              )}
                            >
                              {numberFormatter.format(value)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
                {bottomSpacer > 0 && (
                  <tr>
                    <td colSpan={data.columns.length + 1} style={{ height: bottomSpacer }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              💡 Dữ liệu tự động cập nhật khi thay đổi bộ lọc. Nhấp vào tiêu đề cột để sắp xếp theo kỳ báo cáo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
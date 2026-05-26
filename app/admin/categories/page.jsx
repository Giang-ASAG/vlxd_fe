"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Save, Trash2, X } from "lucide-react";
import { CategoryService } from "@/src/services/api-services";

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadCategories = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await CategoryService.getAll();
            setCategories(response?.data ?? response ?? []);
        } catch (err) {
            setError(err?.message || "Không thể tải danh mục");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleAdd = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setSaving(true);
        setError("");

        try {
            const response = await CategoryService.create({
                tenDanhMuc: trimmedName,
            });
            const created = response?.data ?? response;
            setCategories((prev) => [...prev, created]);
            setName("");
        } catch (err) {
            setError(err?.message || "Thêm danh mục thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (category) => {
        setEditingId(category.maDanhMuc);
        setEditName(category.tenDanhMuc ?? "");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const handleUpdate = async () => {
        const trimmedName = editName.trim();
        if (!trimmedName) return;

        setSaving(true);
        setError("");

        try {
            const response = await CategoryService.update(editingId, {
                tenDanhMuc: trimmedName,
            });
            const updated = response?.data ?? { maDanhMuc: editingId, tenDanhMuc: trimmedName };
            setCategories((prev) =>
                prev.map((item) =>
                    item.maDanhMuc === editingId ? updated : item
                )
            );
            handleCancelEdit();
        } catch (err) {
            setError(err?.message || "Cập nhật danh mục thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setSaving(true);
        setError("");

        try {
            await CategoryService.delete(id);
            setCategories((prev) => prev.filter((item) => item.maDanhMuc !== id));
            if (editingId === id) {
                handleCancelEdit();
            }
        } catch (err) {
            setError(err?.message || "Xóa danh mục thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Quản lý danh mục</h1>
                <p className="text-sm text-muted-foreground">
                    Thêm, sửa và xóa danh mục hàng hóa.
                </p>
            </div>

            <div className="grid gap-4 rounded-xl border border-border bg-background p-6 shadow-sm sm:grid-cols-[1fr_320px]">
                <div>
                    <h2 className="text-lg font-semibold">Danh sách danh mục</h2>
                    <p className="text-sm text-muted-foreground">
                        Quản lý danh mục hiện tại và thực hiện thao tác chỉnh sửa nhanh.
                    </p>
                </div>

                <div className="space-y-3">
                    <Input
                        placeholder="Tên danh mục"
                        value={editingId !== null ? editName : name}
                        onChange={(event) =>
                            editingId !== null
                                ? setEditName(event.target.value)
                                : setName(event.target.value)
                        }
                    />

                    <div className="flex flex-wrap gap-2">
                        {editingId !== null ? (
                            <>
                                <Button
                                    onClick={handleUpdate}
                                    disabled={!editName.trim() || saving}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Cập nhật
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Hủy
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleAdd}
                                disabled={!name.trim() || saving}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Thêm danh mục
                            </Button>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">Danh sách</h3>
                        <p className="text-sm text-muted-foreground">
                            {loading ? "Đang tải danh mục..." : `${categories.length} mục`}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadCategories} disabled={loading || saving}>
                        Tải lại
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>STT</TableHead>
                                <TableHead>Tên danh mục</TableHead>
                                <TableHead>Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category, index) => (
                                <TableRow key={category.maDanhMuc}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{category.tenDanhMuc}</TableCell>
                                    <TableCell className="space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(category)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(category.maDanhMuc)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Xóa
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

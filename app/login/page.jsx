"use client";

import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSession } from "@/src/auth/session";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Giải mã JWT token */
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");
    
    // Decode payload (phần thứ 2)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return null;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (!isValidEmail(email.trim())) return false;
    return true;
  }, [email, password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nextEmail = email.trim().toLowerCase();
    if (!isValidEmail(nextEmail)) {
      setError("Email không hợp lệ.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setSubmitting(true);

      // Gọi API đăng nhập
      const response = await fetch("https://vlxdbe-production.up.railway.app/api/XacThucNguoiDung/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taikhoan: nextEmail,
          matkhau: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "Đăng nhập thất bại");
      }

      const data = await response.json();
      
      if (!data.success || !data.data?.token) {
        throw new Error("Không nhận được token từ server");
      }

      // Giải mã JWT
      const decoded = decodeJWT(data.data.token);
      if (!decoded) {
        throw new Error("Token không hợp lệ");
      }

      // Kiểm tra role
      if (decoded.role !== "admin") {
        throw new Error("Bạn không có quyền truy cập. Chỉ admin mới có thể đăng nhập.");
      }

      // Lưu vào session
      setSession({
        user: {
          sub: decoded.sub,
          name: decoded.name,
          role: decoded.role,
          email: nextEmail,
        },
        token: data.data.token,
        remember,
        createdAt: Date.now(),
      });

      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message ?? "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <div className="hidden lg:block">
          <div className="rounded-2xl border bg-card p-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BuildMart Admin</p>
                <h1 className="text-2xl font-bold tracking-tight">
                  Đăng nhập để quản lý cửa hàng
                </h1>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <div className="rounded-xl border bg-secondary/40 p-4">
                <p className="text-sm font-medium">Nhanh gọn</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Truy cập dashboard, báo cáo và bán hàng (POS) chỉ trong vài giây.
                </p>
              </div>
              <div className="rounded-xl border bg-secondary/40 p-4">
                <p className="text-sm font-medium">An toàn</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tự động đăng xuất khi bạn bấm “Đăng xuất” trên header.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Đăng nhập</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhập email và mật khẩu để tiếp tục.
            </p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@buildmart.vn"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <Link
                      to="/"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={(e) => e.preventDefault()}
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      disabled={submitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={submitting}
                  />
                  Ghi nhớ đăng nhập
                </label>

                {error ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" className="w-full gap-2" disabled={!canSubmit || submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Đăng nhập
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Khi đăng nhập, bạn đồng ý với các điều khoản sử dụng nội bộ.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


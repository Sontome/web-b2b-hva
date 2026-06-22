import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, RefreshCw, Globe, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const AVAILABLE_AIRLINES = ['VJ', 'VNA', 'SUNPQ', 'WE', 'KE', 'OZ', 'TW', 'LJ'];

interface DomainRow {
  domain: string;
  config_json: any;
  updated_at?: string | null;
}

const DomainConfigPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<string>('');
  const [originalDomain, setOriginalDomain] = useState<string | null>(null);
  const [enabledList, setEnabledList] = useState<string[]>([]);
  const [customAirline, setCustomAirline] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const UPDATE_CMD = '~/update_api.sh';
  const handleCopyCmd = async () => {
    try {
      await navigator.clipboard.writeText(UPDATE_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Không thể copy', variant: 'destructive' });
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('domain_config' as any)
      .select('*')
      .order('domain', { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: 'Lỗi tải dữ liệu', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data as any[]) ?? []);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openCreate = () => {
    setOriginalDomain(null);
    setEditingDomain('');
    setEnabledList([]);
    setCustomAirline('');
    setEditOpen(true);
  };

  const openEdit = (row: DomainRow) => {
    const enabled = Array.isArray(row.config_json?.enabled) ? row.config_json.enabled : [];
    setOriginalDomain(row.domain);
    setEditingDomain(row.domain);
    setEnabledList(enabled);
    setCustomAirline('');
    setEditOpen(true);
  };

  const toggleAirline = (code: string) => {
    setEnabledList((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addCustomAirline = () => {
    const code = customAirline.trim().toUpperCase();
    if (!code) return;
    if (enabledList.includes(code)) {
      setCustomAirline('');
      return;
    }
    setEnabledList((prev) => [...prev, code]);
    setCustomAirline('');
  };

  const handleSave = async () => {
    const domain = editingDomain.trim().toLowerCase();
    if (!domain) {
      toast({ title: 'Thiếu domain', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      domain,
      config_json: { enabled: enabledList },
      updated_at: new Date().toISOString(),
    };

    let error;
    if (originalDomain && originalDomain !== domain) {
      // domain renamed — delete old, insert new
      const del = await supabase.from('domain_config' as any).delete().eq('domain', originalDomain);
      if (del.error) {
        setSaving(false);
        toast({ title: 'Lỗi đổi domain', description: del.error.message, variant: 'destructive' });
        return;
      }
      const ins = await supabase.from('domain_config' as any).insert(payload);
      error = ins.error;
    } else {
      const up = await supabase.from('domain_config' as any).upsert(payload, { onConflict: 'domain' });
      error = up.error;
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi lưu', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Đã lưu cấu hình' });
    setEditOpen(false);
    fetchRows();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('domain_config' as any).delete().eq('domain', deleteTarget);
    if (error) {
      toast({ title: 'Lỗi xóa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã xóa' });
      fetchRows();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6" /> Domain Config
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Thêm domain
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Sau khi thay đổi các hãng bay được phép cần chạy lệnh update trên VPS với lệnh:
            </p>
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2 font-mono text-sm w-fit">
              <code>{UPDATE_CMD}</code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleCopyCmd}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danh sách domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Hãng bay được phép</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Chưa có cấu hình
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => {
                    const enabled: string[] = Array.isArray(row.config_json?.enabled)
                      ? row.config_json.enabled
                      : [];
                    return (
                      <TableRow key={row.domain}>
                        <TableCell className="font-mono text-sm">{row.domain}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {enabled.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {enabled.map((code) => (
                              <Badge key={code} variant="secondary">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row.domain)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{originalDomain ? 'Chỉnh sửa domain' : 'Thêm domain mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Domain</Label>
              <Input
                placeholder="ví dụ: apiapp.hanvietair.com"
                value={editingDomain}
                onChange={(e) => setEditingDomain(e.target.value)}
              />
            </div>
            <div>
              <Label>Hãng bay được phép tìm kiếm</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Array.from(new Set([...AVAILABLE_AIRLINES, ...enabledList])).map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={enabledList.includes(code)}
                      onCheckedChange={() => toggleAirline(code)}
                    />
                    <span className="text-sm font-medium">{code}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Thêm mã hãng khác</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="VD: BL"
                  value={customAirline}
                  onChange={(e) => setCustomAirline(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAirline();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomAirline}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {enabledList.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Đã chọn</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {enabledList.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleAirline(code)}
                    >
                      {code} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa cấu hình cho domain <span className="font-mono">{deleteTarget}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DomainConfigPage;

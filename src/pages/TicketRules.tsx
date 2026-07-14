import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, Plus, ArrowLeft, FlaskConical } from 'lucide-react';
import type { TicketCampaign, TicketRule, RuleAction, LegScope, MatchScope, RuleSegmentInput } from '@/types/ticketRules';
import { testMatch } from '@/utils/ticketRuleEngine';

const ACTIONS: RuleAction[] = ['append_note','append_warning','replace_baggage','change_price','hide_ticket','highlight_ticket','change_text'];
const LEG_SCOPES: (LegScope | 'any')[] = ['any','outbound','return'];
const MATCH_SCOPES: (MatchScope | 'any')[] = ['any','direct','connecting'];

const emptyCampaign = (): Partial<TicketCampaign> => ({ name: '', description: '', start_date: null, end_date: null, enabled: true });
const emptyRule = (campaign_id = ''): Partial<TicketRule> => ({
  campaign_id, airline: null, route: null, departure_time: null, arrival_time: null,
  segment_position: null, leg_scope: 'any', match_scope: 'any', booking_class: null,
  require_other_leg_direct: false, action: 'append_note', value: '', priority: 0, enabled: true,
});

export default function TicketRules() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<TicketCampaign[]>([]);
  const [rules, setRules] = useState<TicketRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [campEdit, setCampEdit] = useState<Partial<TicketCampaign> | null>(null);
  const [ruleEdit, setRuleEdit] = useState<Partial<TicketRule> | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  useEffect(() => {
    if (profile && (profile as any).role !== 'admin') navigate('/');
  }, [profile, navigate]);

  const load = async () => {
    setLoading(true);
    const [c, r] = await Promise.all([
      supabase.from('ticket_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('ticket_rules').select('*').order('priority', { ascending: false }),
    ]);
    if (c.data) setCampaigns(c.data as any);
    if (r.data) setRules(r.data as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ---------- campaign ops ----------
  const saveCampaign = async () => {
    if (!campEdit?.name) { toast({ variant: 'destructive', title: 'Thiếu tên chiến dịch' }); return; }
    const payload = {
      name: campEdit.name!,
      description: campEdit.description || null,
      start_date: campEdit.start_date || null,
      end_date: campEdit.end_date || null,
      enabled: campEdit.enabled ?? true,
    };
    const res = campEdit.id
      ? await supabase.from('ticket_campaigns').update(payload).eq('id', campEdit.id)
      : await supabase.from('ticket_campaigns').insert(payload);
    if (res.error) { toast({ variant: 'destructive', title: 'Lỗi', description: res.error.message }); return; }
    toast({ title: 'Đã lưu chiến dịch' });
    setCampEdit(null);
    load();
  };
  const deleteCampaign = async (id: string) => {
    if (!confirm('Xoá chiến dịch (và tất cả rules bên trong)?')) return;
    await supabase.from('ticket_campaigns').delete().eq('id', id);
    load();
  };
  const toggleCampaign = async (c: TicketCampaign) => {
    await supabase.from('ticket_campaigns').update({ enabled: !c.enabled }).eq('id', c.id);
    load();
  };

  // ---------- rule ops ----------
  const saveRule = async () => {
    if (!ruleEdit?.campaign_id) { toast({ variant: 'destructive', title: 'Chọn chiến dịch' }); return; }
    if (!ruleEdit?.action) { toast({ variant: 'destructive', title: 'Chọn action' }); return; }
    const payload = {
      campaign_id: ruleEdit.campaign_id!,
      airline: ruleEdit.airline || null,
      route: ruleEdit.route ? String(ruleEdit.route).toUpperCase() : null,
      departure_time: ruleEdit.departure_time || null,
      arrival_time: ruleEdit.arrival_time || null,
      segment_position: ruleEdit.segment_position ?? null,
      leg_scope: (ruleEdit.leg_scope as any) || 'any',
      match_scope: (ruleEdit.match_scope as any) || 'any',
      booking_class: ruleEdit.booking_class || null,
      require_other_leg_direct: !!ruleEdit.require_other_leg_direct,
      action: ruleEdit.action!,
      value: ruleEdit.value ?? '',
      priority: ruleEdit.priority ?? 0,
      enabled: ruleEdit.enabled ?? true,
    };
    const res = ruleEdit.id
      ? await supabase.from('ticket_rules').update(payload).eq('id', ruleEdit.id)
      : await supabase.from('ticket_rules').insert(payload);
    if (res.error) { toast({ variant: 'destructive', title: 'Lỗi', description: res.error.message }); return; }
    toast({ title: 'Đã lưu rule' });
    setRuleEdit(null);
    load();
  };
  const deleteRule = async (id: string) => {
    if (!confirm('Xoá rule?')) return;
    await supabase.from('ticket_rules').delete().eq('id', id);
    load();
  };
  const toggleRule = async (r: TicketRule) => {
    await supabase.from('ticket_rules').update({ enabled: !r.enabled }).eq('id', r.id);
    load();
  };

  const rulesByCampaign = useMemo(() => {
    const map = new Map<string, TicketRule[]>();
    for (const r of rules) {
      if (!map.has(r.campaign_id)) map.set(r.campaign_id, []);
      map.get(r.campaign_id)!.push(r);
    }
    return map;
  }, [rules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}><ArrowLeft className="w-4 h-4 mr-1"/>Admin</Button>
            <h1 className="text-2xl font-bold">Ticket Rule Engine</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTestOpen(true)}><FlaskConical className="w-4 h-4 mr-1"/>Test rule</Button>
            <Button onClick={() => setCampEdit(emptyCampaign())}><Plus className="w-4 h-4 mr-1"/>Chiến dịch mới</Button>
          </div>
        </div>

        {loading && <p>Đang tải…</p>}

        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {c.name}
                  {!c.enabled && <Badge variant="secondary">Đã tắt</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.start_date || '∞'} → {c.end_date || '∞'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.enabled} onCheckedChange={() => toggleCampaign(c)} />
                <Button size="sm" variant="outline" onClick={() => setCampEdit(c)}><Pencil className="w-4 h-4"/></Button>
                <Button size="sm" variant="outline" onClick={() => deleteCampaign(c.id)}><Trash2 className="w-4 h-4"/></Button>
                <Button size="sm" onClick={() => setRuleEdit(emptyRule(c.id))}><Plus className="w-4 h-4 mr-1"/>Rule</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prio</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Leg</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>OtherDirect</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>On</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rulesByCampaign.get(c.id) || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell>{r.airline || '*'}</TableCell>
                      <TableCell>{r.route || '*'}</TableCell>
                      <TableCell>{r.leg_scope || 'any'}{r.segment_position ? ` #${r.segment_position}` : ''}</TableCell>
                      <TableCell>{r.match_scope || 'any'}</TableCell>
                      <TableCell>{r.booking_class || '*'}</TableCell>
                      <TableCell>{r.require_other_leg_direct ? '✓' : ''}</TableCell>
                      <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.value}</TableCell>
                      <TableCell><Switch checked={r.enabled} onCheckedChange={() => toggleRule(r)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setRuleEdit(r)}><Pencil className="w-4 h-4"/></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(rulesByCampaign.get(c.id) || []).length && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Chưa có rule</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign dialog */}
      <Dialog open={!!campEdit} onOpenChange={(o) => !o && setCampEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{campEdit?.id ? 'Sửa chiến dịch' : 'Chiến dịch mới'}</DialogTitle></DialogHeader>
          {campEdit && (
            <div className="space-y-3">
              <div><Label>Tên</Label><Input value={campEdit.name || ''} onChange={(e) => setCampEdit({ ...campEdit, name: e.target.value })} /></div>
              <div><Label>Mô tả</Label><Textarea value={campEdit.description || ''} onChange={(e) => setCampEdit({ ...campEdit, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start date</Label><Input type="date" value={campEdit.start_date || ''} onChange={(e) => setCampEdit({ ...campEdit, start_date: e.target.value || null })} /></div>
                <div><Label>End date</Label><Input type="date" value={campEdit.end_date || ''} onChange={(e) => setCampEdit({ ...campEdit, end_date: e.target.value || null })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!campEdit.enabled} onCheckedChange={(v) => setCampEdit({ ...campEdit, enabled: v })} /><Label>Bật</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveCampaign}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule dialog */}
      <Dialog open={!!ruleEdit} onOpenChange={(o) => !o && setRuleEdit(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{ruleEdit?.id ? 'Sửa rule' : 'Rule mới'}</DialogTitle></DialogHeader>
          {ruleEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Campaign</Label>
                <Select value={ruleEdit.campaign_id || ''} onValueChange={(v) => setRuleEdit({ ...ruleEdit, campaign_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn campaign"/></SelectTrigger>
                  <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Airline (VJ / VNA / SUN, để trống = mọi hãng)</Label><Input value={ruleEdit.airline || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, airline: e.target.value || null })} /></div>
              <div><Label>Route (ICN-HAN)</Label><Input value={ruleEdit.route || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, route: e.target.value.toUpperCase() || null })} /></div>
              <div><Label>Booking class (V / V,W / &gt;=V / &lt;=V)</Label><Input value={ruleEdit.booking_class || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, booking_class: e.target.value || null })} /></div>
              <div><Label>Departure time (HH:mm)</Label><Input value={ruleEdit.departure_time || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, departure_time: e.target.value || null })} /></div>
              <div><Label>Arrival time (HH:mm)</Label><Input value={ruleEdit.arrival_time || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, arrival_time: e.target.value || null })} /></div>
              <div>
                <Label>Leg scope</Label>
                <Select value={(ruleEdit.leg_scope as any) || 'any'} onValueChange={(v) => setRuleEdit({ ...ruleEdit, leg_scope: v as any })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{LEG_SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Match scope</Label>
                <Select value={(ruleEdit.match_scope as any) || 'any'} onValueChange={(v) => setRuleEdit({ ...ruleEdit, match_scope: v as any })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{MATCH_SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Segment position (1,2… hoặc trống)</Label><Input type="number" value={ruleEdit.segment_position ?? ''} onChange={(e) => setRuleEdit({ ...ruleEdit, segment_position: e.target.value ? parseInt(e.target.value) : null })} /></div>
              <div className="flex items-center gap-2 mt-6"><Switch checked={!!ruleEdit.require_other_leg_direct} onCheckedChange={(v) => setRuleEdit({ ...ruleEdit, require_other_leg_direct: v })} /><Label>Yêu cầu chiều còn lại bay thẳng</Label></div>
              <div>
                <Label>Action</Label>
                <Select value={ruleEdit.action || 'append_note'} onValueChange={(v) => setRuleEdit({ ...ruleEdit, action: v as any })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={ruleEdit.priority ?? 0} onChange={(e) => setRuleEdit({ ...ruleEdit, priority: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><Label>Value (text ghi chú / số tiền / field=text)</Label><Textarea value={ruleEdit.value || ''} onChange={(e) => setRuleEdit({ ...ruleEdit, value: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={ruleEdit.enabled ?? true} onCheckedChange={(v) => setRuleEdit({ ...ruleEdit, enabled: v })} /><Label>Bật</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveRule}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <TestRuleDialog open={testOpen} onOpenChange={setTestOpen} dataset={{ campaigns, rules }} />
    </div>
  );
}

function TestRuleDialog({ open, onOpenChange, dataset }: { open: boolean; onOpenChange: (v: boolean) => void; dataset: { campaigns: TicketCampaign[]; rules: TicketRule[] } }) {
  const [form, setForm] = useState<RuleSegmentInput & { other_leg_size: number }>({
    airline: 'SUN', from: 'ICN', to: 'HAN',
    departure_time: '', arrival_time: '', departure_date: '',
    segment_order: 1, leg_index: 0, leg_size: 1,
    booking_class: 'V', other_leg_size: 1,
  });
  const matched = testMatch(form, dataset).filter((r) => {
    if (!r.require_other_leg_direct) return true;
    if (form.other_leg_size === 0) return true; // OW
    return form.other_leg_size === 1;
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Test rule</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Airline</Label><Input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })}/></div>
          <div><Label>Booking class</Label><Input value={form.booking_class || ''} onChange={(e) => setForm({ ...form, booking_class: e.target.value })}/></div>
          <div><Label>From</Label><Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value.toUpperCase() })}/></div>
          <div><Label>To</Label><Input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value.toUpperCase() })}/></div>
          <div><Label>Dep time</Label><Input value={form.departure_time || ''} onChange={(e) => setForm({ ...form, departure_time: e.target.value })}/></div>
          <div><Label>Arr time</Label><Input value={form.arrival_time || ''} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}/></div>
          <div><Label>Date</Label><Input type="date" value={form.departure_date || ''} onChange={(e) => setForm({ ...form, departure_date: e.target.value })}/></div>
          <div><Label>Segment order</Label><Input type="number" value={form.segment_order} onChange={(e) => setForm({ ...form, segment_order: parseInt(e.target.value) || 1 })}/></div>
          <div><Label>Leg index (0 đi / 1 về)</Label><Input type="number" value={form.leg_index ?? 0} onChange={(e) => setForm({ ...form, leg_index: parseInt(e.target.value) })}/></div>
          <div><Label>Leg size (1 direct)</Label><Input type="number" value={form.leg_size} onChange={(e) => setForm({ ...form, leg_size: parseInt(e.target.value) || 1 })}/></div>
          <div>
            <Label>Other leg size (0 OW / 1 direct / 2+ connect)</Label>
            <Input type="number" value={form.other_leg_size} onChange={(e) => setForm({ ...form, other_leg_size: parseInt(e.target.value) || 0 })}/>
          </div>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Rules khớp ({matched.length}):</h4>
          <div className="space-y-1 text-sm max-h-64 overflow-auto">
            {matched.map(r => (
              <div key={r.id} className="border rounded p-2">
                <Badge variant="outline" className="mr-2">{r.action}</Badge>
                {r.value} <span className="text-muted-foreground">(prio {r.priority})</span>
              </div>
            ))}
            {!matched.length && <p className="text-muted-foreground">Không có rule nào khớp.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

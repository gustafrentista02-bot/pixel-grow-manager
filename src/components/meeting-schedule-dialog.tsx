import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { getCompanySettings } from "@/lib/company-api";
import type { Lead } from "@/lib/leads-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConfirm: (reuniao_at: string, meet_link: string) => void;
};

/** Prompts for date/time + Meet link when moving a lead into the "Reunião" stage. */
export function MeetingScheduleDialog({ open, onOpenChange, lead, onConfirm }: Props) {
  const { data: settings } = useQuery({ queryKey: ["company-settings"], queryFn: getCompanySettings, enabled: open });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meet, setMeet] = useState("");

  // seed defaults when opening
  const defaultMeet = meet || lead?.meet_link || settings?.meet_padrao || "";

  function handleConfirm() {
    if (!date || !time) return;
    const iso = new Date(`${date}T${time}`).toISOString();
    onConfirm(iso, defaultMeet);
    setDate(""); setTime(""); setMeet("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar reunião</DialogTitle>
          <DialogDescription>
            {lead ? `${lead.nome}${lead.empresa ? ` · ${lead.empresa}` : ""}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Link do Meet</Label>
            <Input
              value={defaultMeet}
              onChange={(e) => setMeet(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!date || !time}>Salvar reunião</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

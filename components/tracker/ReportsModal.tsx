"use client";

import { useMemo, useState } from "react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import Papa from "papaparse";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimelineEntry } from "./TimeTimeline";

type ReportsModalProps = {
  open: boolean;
  onClose: () => void;
  entries: TimelineEntry[];
};

type Filters = {
  startDate: string;
  endDate: string;
  billableOnly: boolean;
};

export function ReportsModal({ open, onClose, entries }: ReportsModalProps) {
  const [filters, setFilters] = useState<Filters>({
    startDate: defaultDate(-7),
    endDate: defaultDate(0),
    billableOnly: false,
  });

  const dateBounds = useMemo(() => {
    const start = parseDate(filters.startDate);
    const end = parseDate(filters.endDate);
    if (!start || !end) return { start: null, end: null, isValidRange: false };
    const [minDate, maxDate] = start <= end ? [start, end] : [end, start];
    return {
      start: startOfDay(minDate),
      end: endOfDay(maxDate),
      isValidRange: true,
    };
  }, [filters.startDate, filters.endDate]);

  const filteredEntries = useMemo(() => {
    if (!dateBounds.isValidRange || !dateBounds.start || !dateBounds.end) return [];
    const { start, end } = dateBounds;
    return entries.filter((entry) => {
      const ts = new Date(entry.start_time);
      if (ts < start || ts > end) return false;
      if (filters.billableOnly && entry.billable === false) return false;
      return true;
    });
  }, [dateBounds, entries, filters]);

  const totals = useMemo(() => {
    const totalSeconds = filteredEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
    const billableSeconds = filteredEntries.reduce(
      (sum, e) => sum + (e.billable === false ? 0 : e.duration_seconds ?? 0),
      0,
    );
    return { totalSeconds, billableSeconds };
  }, [filteredEntries]);

  const downloadCsv = () => {
    const rows = filteredEntries.map((e) => ({
      date: format(new Date(e.start_time), "yyyy-MM-dd"),
      project: e.project_name ?? "Untitled",
      description: e.description ?? "",
      duration_hours: ((e.duration_seconds ?? 0) / 3600).toFixed(2),
      billable: e.billable === false ? "No" : "Yes",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "time-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
      <div className="w-full max-w-3xl rounded-2xl border border-border/70 bg-card p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reports</p>
            <h3 className="text-lg font-semibold">Export CSV / PDF</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="my-3" />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 md:col-span-1">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="billableOnly"
                checked={filters.billableOnly}
                onCheckedChange={(val) => setFilters((f) => ({ ...f, billableOnly: Boolean(val) }))}
              />
              <Label htmlFor="billableOnly">Billable only</Label>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2" onClick={downloadCsv} disabled={!dateBounds.isValidRange}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              {dateBounds.isValidRange && filteredEntries.length > 0 ? (
                <PDFDownloadLink
                  document={<ReportPdf entries={filteredEntries} totals={totals} />}
                  fileName="time-report.pdf"
                >
                  {({ loading }) => (
                    <Button variant="secondary" className="gap-2" disabled={loading}>
                      <Download className="h-4 w-4" />
                      {loading ? "Building..." : "PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              ) : (
                <Button variant="secondary" className="gap-2" disabled>
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <ScrollArea className="h-72 rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {["Date", "Project", "Description", "Duration", "Billable"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e) => (
                    <tr key={e.id} className="border-b border-border/60">
                      <td className="px-3 py-2">{format(new Date(e.start_time), "yyyy-MM-dd")}</td>
                      <td className="px-3 py-2">{e.project_name || "Untitled"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.description || "—"}</td>
                      <td className="px-3 py-2">{((e.duration_seconds ?? 0) / 3600).toFixed(2)}h</td>
                      <td className="px-3 py-2">{e.billable === false ? "No" : "Yes"}</td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                        No data for filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
            <div className="mt-2 text-sm text-muted-foreground">
              Totals: {(totals.totalSeconds / 3600).toFixed(2)}h • Billable {(totals.billableSeconds / 3600).toFixed(2)}h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  row: { flexDirection: "row", marginBottom: 6 },
  headerRow: { flexDirection: "row", marginBottom: 8, borderBottomWidth: 1, paddingBottom: 4 },
  cell: { flex: 1 },
  bold: { fontWeight: 700 },
});

function ReportPdf({ entries, totals }: { entries: TimelineEntry[]; totals: { totalSeconds: number; billableSeconds: number } }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={[pdfStyles.headerRow]}>
          <Text style={[pdfStyles.cell, pdfStyles.bold]}>Date</Text>
          <Text style={[pdfStyles.cell, pdfStyles.bold]}>Project</Text>
          <Text style={[pdfStyles.cell, pdfStyles.bold]}>Description</Text>
          <Text style={[pdfStyles.cell, pdfStyles.bold]}>Duration (h)</Text>
          <Text style={[pdfStyles.cell, pdfStyles.bold]}>Billable</Text>
        </View>
        {entries.map((e) => (
          <View key={e.id} style={pdfStyles.row}>
            <Text style={pdfStyles.cell}>{format(new Date(e.start_time), "yyyy-MM-dd")}</Text>
            <Text style={pdfStyles.cell}>{e.project_name || "Untitled"}</Text>
            <Text style={pdfStyles.cell}>{e.description || "—"}</Text>
            <Text style={pdfStyles.cell}>{((e.duration_seconds ?? 0) / 3600).toFixed(2)}</Text>
            <Text style={pdfStyles.cell}>{e.billable === false ? "No" : "Yes"}</Text>
          </View>
        ))}
        <View style={{ marginTop: 12 }}>
          <Text>Total hours: {(totals.totalSeconds / 3600).toFixed(2)}</Text>
          <Text>Billable hours: {(totals.billableSeconds / 3600).toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
}

function defaultDate(offsetDays: number) {
  return format(addDays(new Date(), offsetDays), "yyyy-MM-dd");
}

function parseDate(value: string) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}



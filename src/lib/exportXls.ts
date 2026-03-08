import * as XLSX from "xlsx";

type Contact = {
  name: string;
  phone: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  adults_count: number | null;
  kids_count: number | null;
  lead_time: string | null;
  type: string;
  notes: string | null;
  source: string | null;
  city: string | null;
  follow_up_date: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  lead: "4472C4",
  interested: "70AD47",
  "follow-up": "FFC000",
  negotiation: "FFC000",
  booked: "00B050",
  lost: "FF0000",
  cancelled: "FF0000",
  "not-interested": "ED7D31",
  "booked-with-others": "BF8F00",
  "package-sent": "9DC3E6",
  confirmed: "00B050",
  "no-reply": "A5A5A5",
  postponed: "7030A0",
};

const STATUS_LABELS: Record<string, string> = {
  lead: "New Lead",
  interested: "Interested",
  "follow-up": "Follow Up",
  negotiation: "Need Discount",
  booked: "Booked",
  lost: "Lost",
  cancelled: "Cancelled",
  "not-interested": "Not Interested",
  "booked-with-others": "Booked with Others",
  "package-sent": "Package Sent",
  confirmed: "Confirmed",
  "no-reply": "No Reply",
  postponed: "Postponed",
};

export function exportContactsToXls(contacts: Contact[], statusMap?: { value: string; label: string; color: string }[]) {
  const data = contacts.map((c, i) => ({
    "SL": i + 1,
    "Date": new Date(c.created_at).toLocaleDateString("en-IN"),
    "Name": c.name,
    "Number": c.phone || "",
    "City": c.city || "",
    "Check In": c.check_in_date || "",
    "Check Out": c.check_out_date || "",
    "Number of People": (c.adults_count || 0) + (c.kids_count || 0),
    "Time": c.lead_time || "",
    "Status": statusMap?.find(s => s.value === c.type)?.label || STATUS_LABELS[c.type] || c.type,
    "Remarks": c.notes?.split("\n")[0]?.replace(/\[.*?\]\s?/, "") || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Freeze first row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  if (!ws["!views"]) ws["!views"] = [];
  ws["!views"][0] = { state: "frozen", ySplit: 1 };

  // Column widths
  ws["!cols"] = [
    { wch: 4 },  // SL
    { wch: 12 }, // Date
    { wch: 18 }, // Name
    { wch: 14 }, // Number
    { wch: 14 }, // City
    { wch: 12 }, // Check In
    { wch: 12 }, // Check Out
    { wch: 14 }, // People
    { wch: 8 },  // Time
    { wch: 20 }, // Status
    { wch: 22 }, // Remarks
  ];

  // Header styling
  const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1:K1");
  for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      fill: { fgColor: { rgb: "1A1A2E" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };
  }

  // Data cell styling with status colors
  for (let R = 1; R <= data.length; R++) {
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      
      const isStatusCol = C === 9; // Status column
      const statusValue = contacts[R - 1]?.type || "";
      const statusColor = STATUS_COLORS[statusValue] || "FFFFFF";

      ws[addr].s = {
        font: { sz: 10, ...(isStatusCol ? { bold: true, color: { rgb: "FFFFFF" } } : {}) },
        fill: isStatusCol ? { fgColor: { rgb: statusColor } } : { fgColor: { rgb: R % 2 === 0 ? "F2F2F2" : "FFFFFF" } },
        alignment: { horizontal: C === 0 || C === 6 ? "center" : "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "D9D9D9" } },
          bottom: { style: "thin", color: { rgb: "D9D9D9" } },
          left: { style: "thin", color: { rgb: "D9D9D9" } },
          right: { style: "thin", color: { rgb: "D9D9D9" } },
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, `DandeliCRM_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

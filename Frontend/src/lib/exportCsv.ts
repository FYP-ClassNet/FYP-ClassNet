export function exportAttendanceCsv(
  sessionCode: string,
  records: {
    student_name: string;
    roll_number: string;
    status: string;
    joined_at: string;
    left_at: string | null;
    total_online_seconds: number;
    reconnect_count: number;
  }[]
) {
  const headers = [
    "Roll Number",
    "Name",
    "Status",
    "Joined At",
    "Left At",
    "Total Online Time",
    "Reconnects",
  ];

  const now = new Date();

  const rows = records.map((r) => {
    // If still online, calculate time from joined_at to now
    let onlineSeconds = Number(r.total_online_seconds);
    if (!r.left_at && r.joined_at) {
      const joinedAt = new Date(r.joined_at.replace(" ", "T") + "Z");
      onlineSeconds = Math.floor((now.getTime() - joinedAt.getTime()) / 1000);
    }

    return [
      r.roll_number,
      r.student_name,
      r.status,
      r.joined_at ? new Date(r.joined_at.replace(" ", "T") + "Z").toLocaleString() : "-",
      r.left_at ? new Date(r.left_at.replace(" ", "T") + "Z").toLocaleString() : "Still Online",
      formatSeconds(onlineSeconds),
      r.reconnect_count,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${sessionCode}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
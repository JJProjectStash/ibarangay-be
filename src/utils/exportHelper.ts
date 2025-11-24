import { createObjectCsvWriter } from "csv-writer";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const exportsDir = path.join(process.cwd(), "exports");

// Ensure exports directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

export const exportComplaintsToCSV = async (
  complaints: any[],
  filename: string,
): Promise<string> => {
  const filePath = path.join(exportsDir, `${filename}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "id", title: "ID" },
      { id: "title", title: "Title" },
      { id: "description", title: "Description" },
      { id: "category", title: "Category" },
      { id: "status", title: "Status" },
      { id: "priority", title: "Priority" },
      { id: "userName", title: "Submitted By" },
      { id: "userEmail", title: "Email" },
      { id: "assignedTo", title: "Assigned To" },
      { id: "createdAt", title: "Created At" },
      { id: "resolvedAt", title: "Resolved At" },
      { id: "rating", title: "Rating" },
    ],
  });

  const records = complaints.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    description: c.description,
    category: c.category,
    status: c.status,
    priority: c.priority,
    userName: c.userId ? `${c.userId.firstName} ${c.userId.lastName}` : "N/A",
    userEmail: c.userId?.email || "N/A",
    assignedTo: c.assignedTo
      ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}`
      : "Unassigned",
    createdAt: c.createdAt?.toISOString() || "",
    resolvedAt: c.resolvedAt?.toISOString() || "",
    rating: c.rating || "N/A",
  }));

  await csvWriter.writeRecords(records);
  return filePath;
};

export const exportComplaintsToExcel = async (
  complaints: any[],
  filename: string,
): Promise<string> => {
  const filePath = path.join(exportsDir, `${filename}.xlsx`);

  const data = complaints.map((c) => ({
    ID: c._id.toString(),
    Title: c.title,
    Description: c.description,
    Category: c.category,
    Status: c.status,
    Priority: c.priority,
    "Submitted By": c.userId
      ? `${c.userId.firstName} ${c.userId.lastName}`
      : "N/A",
    Email: c.userId?.email || "N/A",
    "Assigned To": c.assignedTo
      ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}`
      : "Unassigned",
    "Created At": c.createdAt?.toISOString() || "",
    "Resolved At": c.resolvedAt?.toISOString() || "",
    Rating: c.rating || "N/A",
    Feedback: c.feedback || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");

  // Auto-size columns
  const maxWidth = data.reduce((w: any, r: any) => {
    return Object.keys(r).map((k, i) => {
      const cellValue = r[k]?.toString() || "";
      return Math.max(w[i] || 10, cellValue.length);
    });
  }, []);

  worksheet["!cols"] = maxWidth.map((w: number) => ({
    wch: Math.min(w + 2, 50),
  }));

  XLSX.writeFile(workbook, filePath);
  return filePath;
};

export const deleteExportFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting export file:", error);
  }
};

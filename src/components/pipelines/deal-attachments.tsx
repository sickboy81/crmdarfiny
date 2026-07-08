"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Paperclip,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  X,
} from "lucide-react";

interface Attachment {
  id: string;
  deal_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface DealAttachmentsProps {
  dealId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | null) {
  if (!type) return <File className="h-4 w-4" />;
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DealAttachments({
  dealId,
  attachments,
  onAttachmentsChange,
}: DealAttachmentsProps) {
  const t = useTranslations("dealAttachments");
  const { accountId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!accountId) return;
      setUploading(true);
      const db = createClient();

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `account-${accountId}/deals/${dealId}/${Date.now()}-${ext}`;

        const { error: uploadError } = await db.storage
          .from("deal-attachments")
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          toast.error(t("uploadError"));
          continue;
        }

        const { data: urlData } = db.storage
          .from("deal-attachments")
          .getPublicUrl(path);

        const { error: dbError } = await db.from("deal_attachments").insert({
          deal_id: dealId,
          account_id: accountId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        });

        if (dbError) {
          toast.error(t("uploadError"));
        }
      }

      setUploading(false);
      onAttachmentsChange();
    },
    [dealId, accountId, onAttachmentsChange, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload],
  );

  async function handleDelete(attachment: Attachment) {
    const db = createClient();

    // Extract storage path from URL
    const urlParts = attachment.file_url.split("/deal-attachments/");
    if (urlParts[1]) {
      await db.storage.from("deal-attachments").remove([urlParts[1]]);
    }

    const { error } = await db
      .from("deal_attachments")
      .delete()
      .eq("id", attachment.id);

    if (error) {
      toast.error(t("deleteError"));
      return;
    }
    onAttachmentsChange();
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {uploading ? t("uploading") : t("dropzone")}
        </p>
        <p className="text-[10px] text-muted-foreground/60">{t("fileLimit")}</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2 transition-colors hover:bg-muted/60"
            >
              {getFileIcon(att.file_type)}
              <div className="min-w-0 flex-1">
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[13px] font-medium text-foreground hover:underline"
                >
                  {att.file_name}
                </a>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.file_size)}
                  {att.file_size ? " · " : ""}
                  {formatDate(att.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={att.file_url}
                  download={att.file_name}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={t("download")}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => handleDelete(att)}
                  className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  title={t("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

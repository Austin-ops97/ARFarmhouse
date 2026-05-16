"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChecklistMediaUploadCard,
  ChecklistSection,
  ChecklistSliderRow,
  ChecklistToggleRow,
  useChecklistImageHandlers,
  type LocalChecklistImage,
} from "@/components/ar-farmhouse/checklist-form-controls";
import { Button } from "@/components/ui/button";
import {
  CHECKLIST_MEDIA_FIELDS,
  CHECKLIST_SLIDER_FIELDS,
  CHECKLIST_TOGGLE_FIELDS,
  createEmptyChecklistFormValues,
} from "@/lib/checklist-fields";
import type { ChecklistImageFieldKey } from "@/models/checklist";
import {
  allocateChecklistSubmissionId,
  submitChecklistSubmission,
  type ChecklistUploadProgress,
} from "@/services/checklists";
import { cn } from "@/lib/utils";

type FormValues = ReturnType<typeof createEmptyChecklistFormValues>;

type ChecklistLastManOutFormProps = {
  userId: string;
  displayName: string;
  onSubmitted: () => void;
};

export function ChecklistLastManOutForm({ userId, displayName, onSubmitted }: ChecklistLastManOutFormProps) {
  const [values, setValues] = useState<FormValues>(() => createEmptyChecklistFormValues());
  const [images, setImages] = useState<Partial<Record<ChecklistImageFieldKey, LocalChecklistImage>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const { onPick, onClear } = useChecklistImageHandlers(images, setImages);

  useEffect(() => {
    return () => {
      for (const img of Object.values(images)) {
        if (img?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(img.previewUrl);
      }
    };
  }, [images]);

  const applyUploadProgress = useCallback((progress: ChecklistUploadProgress) => {
    setImages((prev) => {
      const current = prev[progress.field];
      if (!current) return prev;
      return {
        ...prev,
        [progress.field]: { ...current, uploadProgress: progress.percent },
      };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    setStatusMessage("Preparing walkthrough…");

    try {
      const submissionId = allocateChecklistSubmissionId();
      const files: Partial<Record<ChecklistImageFieldKey, File>> = {};
      for (const [key, attachment] of Object.entries(images)) {
        if (attachment?.file) files[key as ChecklistImageFieldKey] = attachment.file;
      }

      setStatusMessage("Uploading photos…");
      await submitChecklistSubmission({
        submissionId,
        input: {
          submittedBy: userId,
          submittedByName: displayName,
          ...values,
        },
        images: files,
        onUploadProgress: applyUploadProgress,
      });

      setValues(createEmptyChecklistFormValues());
      setImages({});
      setStatusMessage("Checklist submitted.");
      onSubmitted();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not submit checklist. Check your connection and try again.";
      setError(message);
      setStatusMessage(null);
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }, [applyUploadProgress, displayName, images, onSubmitted, submitting, userId, values]);

  const sliderRows = useMemo(
    () =>
      CHECKLIST_SLIDER_FIELDS.map((field) => (
        <ChecklistSliderRow
          key={field.key}
          label={field.label}
          value={values[field.key]}
          disabled={submitting}
          image={images[field.key]}
          onValueChange={(next) => setValues((v) => ({ ...v, [field.key]: next }))}
          onImagePick={(file) => onPick(field.key, file)}
          onImageClear={() => onClear(field.key)}
        />
      )),
    [images, onClear, onPick, submitting, values]
  );

  const toggleRows = useMemo(
    () =>
      CHECKLIST_TOGGLE_FIELDS.map((field) => (
        <ChecklistToggleRow
          key={field.key}
          label={field.label}
          subtitle={field.subtitle}
          checked={values[field.key]}
          disabled={submitting}
          image={images[field.key]}
          onCheckedChange={(next) => setValues((v) => ({ ...v, [field.key]: next }))}
          onImagePick={(file) => onPick(field.key, file)}
          onImageClear={() => onClear(field.key)}
        />
      )),
    [images, onClear, onPick, submitting, values]
  );

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Complete this walkthrough before leaving the property. Log whatever you checked or photographed.
      </p>

      <ChecklistSection title="Levels">{sliderRows}</ChecklistSection>

      <ChecklistSection title="Property checks">{toggleRows}</ChecklistSection>

      {CHECKLIST_MEDIA_FIELDS.map((field) => (
        <ChecklistMediaUploadCard
          key={field.key}
          label={field.label}
          image={images[field.key]}
          disabled={submitting}
          onImagePick={(file) => onPick(field.key, file)}
          onImageClear={() => onClear(field.key)}
        />
      ))}

      {error ? (
        <p className="rounded-2xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {statusMessage && !error ? (
        <p className="text-center text-sm text-muted-foreground">{statusMessage}</p>
      ) : null}

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 pt-2">
        <Button
          type="button"
          size="lg"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          className={cn(
            "h-14 w-full rounded-2xl text-base font-semibold shadow-[var(--ar-float-hero)]",
            "disabled:opacity-50"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Checklist"
          )}
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  FileCheck2,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import Dropzone from "../components/Dropzone";
import FileSummary from "../components/FileSummary";
import FoundingProCard from "../components/FoundingProCard";
import ResultPanel from "../components/ResultPanel";
import ToolPage from "../components/ToolPage";
import { Button, Card, ErrorBox, ProgressBar } from "../components/ui";
import { useT } from "../i18n";
import { useSinglePdf } from "../hooks/useSinglePdf";
import { auditPdfForRelease, sanitizePdfForRelease } from "../lib/api";
import { setHandoff } from "../lib/handoff";
import type { ReleaseAudit } from "../lib/types";
import { baseName, pdfBlob } from "../lib/utils";
import type { OutputFile } from "../lib/utils";
import { trackProductEvent } from "../lib/analytics";

interface ReleaseResult {
  files: OutputFile[];
  verified: boolean;
}

function findingTotal(audit: ReleaseAudit): number {
  return (
    audit.metadataFields +
    audit.annotations +
    audit.formFields +
    audit.attachments +
    audit.scripts +
    Object.values(audit.possibleSensitiveText).reduce((sum, count) => sum + count, 0)
  );
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function SafeToShare() {
  const t = useT();
  const navigate = useNavigate();
  const pdf = useSinglePdf();
  const [audit, setAudit] = useState<ReleaseAudit | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReleaseResult | null>(null);

  useEffect(() => {
    if (!pdf.bytes) {
      setAudit(null);
      return;
    }
    let active = true;
    setScanning(true);
    setScanProgress(0);
    auditPdfForRelease(pdf.bytes, (done, total) => {
      if (active) setScanProgress(done / total);
    })
      .then((nextAudit) => {
        if (!active) return;
        setAudit(nextAudit);
        trackProductEvent({
          name: "release_scan_completed",
          findingBand: findingTotal(nextAudit) === 0 ? "none" : "review",
        });
      })
      .catch((error) => active && pdf.setError(error instanceof Error ? error.message : t.safeToShare.failed))
      .finally(() => active && setScanning(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.bytes]);

  const risks = useMemo(() => {
    if (!audit) return [];
    const possibleSensitive = Object.values(audit.possibleSensitiveText).reduce(
      (sum, count) => sum + count,
      0,
    );
    return [
      { label: t.safeToShare.riskMetadata, count: audit.metadataFields },
      { label: t.safeToShare.riskAnnotations, count: audit.annotations },
      { label: t.safeToShare.riskForms, count: audit.formFields },
      { label: t.safeToShare.riskAttachments, count: audit.attachments },
      { label: t.safeToShare.riskScripts, count: audit.scripts },
      { label: t.safeToShare.riskSensitive, count: possibleSensitive },
    ];
  }, [audit, t]);

  async function createReleaseCopy() {
    if (!pdf.bytes || !pdf.file || !audit) return;
    setBusy(true);
    setProgress(0);
    pdf.setError("");
    try {
      const output = await sanitizePdfForRelease(pdf.bytes, 150, (done, total) =>
        setProgress(done / total),
      );
      const verification = await auditPdfForRelease(output);
      const verified = findingTotal(verification) === 0;
      const receipt = {
        schema: "private-document-toolbox/release-receipt/v1",
        generatedAt: new Date().toISOString(),
        method: "maximum-safety-rasterized-export",
        sourceSha256: await sha256(pdf.bytes),
        outputSha256: await sha256(output),
        pages: audit.pageCount,
        sourceFindings: audit,
        verification,
        verified,
        humanReviewAcknowledged: true,
        note: "This receipt records automated checks, not legal or regulatory certification.",
      };
      const stem = baseName(pdf.file.name);
      setResult({
        verified,
        files: [
          { name: `${stem}-safe-to-share.pdf`, blob: pdfBlob(output) },
          {
            name: `${stem}-release-receipt.json`,
            blob: new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }),
          },
        ],
      });
      trackProductEvent({ name: "safe_export_created", verified });
    } catch (error) {
      pdf.setError(error instanceof Error ? error.message : t.safeToShare.failed);
    } finally {
      setBusy(false);
    }
  }

  function openRedaction() {
    if (!pdf.bytes || !pdf.file) return;
    setHandoff(pdf.file.name, pdf.bytes);
    navigate("/redact");
  }

  function reset() {
    pdf.reset();
    setAudit(null);
    setAcknowledged(false);
    setResult(null);
    setProgress(0);
  }

  return (
    <ToolPage>
      {result ? (
        <div className="space-y-5">
          <div
            className={`rounded-2xl p-5 ring-1 ${
              result.verified
                ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                : "bg-amber-50 text-amber-900 ring-amber-200"
            }`}
          >
            <p className="flex items-center gap-2 font-bold">
              {result.verified ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {result.verified ? t.safeToShare.verified : t.safeToShare.verificationWarning}
            </p>
          </div>
          <ResultPanel
            files={result.files}
            zipName="safe-to-share-release.zip"
            note={t.safeToShare.resultNote}
            onReset={reset}
          />
          <FoundingProCard placement="result" tool="safe-to-share" />
        </div>
      ) : !pdf.file ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={pdf.onFiles}
            hint={t.safeToShare.dropHint}
          />
          <Card className="bg-slate-950 text-white ring-slate-800">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              {t.safeToShare.howEyebrow}
            </p>
            <h2 className="mt-3 text-xl font-bold">{t.safeToShare.howTitle}</h2>
            <ol className="mt-5 space-y-4 text-sm text-slate-300">
              {[
                [ScanSearch, t.safeToShare.howScan],
                [EyeOff, t.safeToShare.howFlatten],
                [FileCheck2, t.safeToShare.howVerify],
              ].map(([Icon, copy], index) => {
                const StepIcon = Icon as typeof ScanSearch;
                return (
                  <li key={String(copy)} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-violet-200">
                      <StepIcon className="h-4 w-4" />
                    </span>
                    <span><strong className="mr-1 text-white">{index + 1}.</strong>{String(copy)}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
          <div className="lg:col-span-2"><ErrorBox>{pdf.error}</ErrorBox></div>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="!p-4">
            <FileSummary
              name={pdf.file.name}
              size={pdf.file.size}
              pageCount={pdf.pageCount}
              thumbnail={pdf.summary?.thumbnail ?? null}
            />
          </Card>

          {scanning ? (
            <Card className="space-y-4">
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <ScanSearch className="h-5 w-5 text-violet-600" /> {t.safeToShare.scanning}
              </p>
              <ProgressBar value={scanProgress} />
            </Card>
          ) : audit ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                    {t.safeToShare.scanEyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {findingTotal(audit) === 0
                      ? t.safeToShare.scanClear
                      : t.safeToShare.scanFound(findingTotal(audit))}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {t.common.pages(audit.pageCount)}
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {risks.map((risk) => (
                  <div
                    key={risk.label}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
                      risk.count > 0
                        ? "bg-amber-50 text-amber-900 ring-amber-200"
                        : "bg-emerald-50 text-emerald-900 ring-emerald-200"
                    }`}
                  >
                    <span className="text-sm font-medium">{risk.label}</span>
                    <span className="text-sm font-bold">
                      {risk.count > 0 ? risk.count : <CheckCircle2 className="h-4 w-4" />}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                {audit.selectableTextCharacters === 0
                  ? t.safeToShare.imageOnlyWarning
                  : t.safeToShare.textScanNote}
              </p>
            </Card>
          ) : null}

          {audit && (
            <Card className="border-l-4 !border-l-violet-600">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-violet-600" /> {t.safeToShare.exportTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t.safeToShare.exportBody}</p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm leading-6 text-slate-700">{t.safeToShare.acknowledge}</span>
              </label>
              {busy && <div className="mt-4"><ProgressBar value={progress} /></div>}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={createReleaseCopy} busy={busy} disabled={!acknowledged || busy}>
                  <ShieldCheck className="h-4 w-4" /> {t.safeToShare.action}
                </Button>
                <Button variant="secondary" onClick={openRedaction} disabled={busy}>
                  <EyeOff className="h-4 w-4" /> {t.safeToShare.openRedact}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={busy}>
                  {t.common.chooseAnotherFile}
                </Button>
              </div>
            </Card>
          )}
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      )}
    </ToolPage>
  );
}

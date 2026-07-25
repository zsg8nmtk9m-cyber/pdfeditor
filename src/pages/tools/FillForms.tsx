import { useEffect, useState } from "react";
import { PenLine, TextCursorInput } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, Select, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { fillForm, readFormFields } from "../../lib/api";
import { saveRecent } from "../../lib/fileStore";
import { setHandoff, takeHandoff } from "../../lib/handoff";
import type { FormFieldInfo, FormValues } from "../../lib/types";
import { baseName, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormFieldInfo;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const t = useT();
  switch (field.kind) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2.5 py-2">
          <input
            type="checkbox"
            checked={value === true}
            disabled={field.readOnly}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">{field.name}</span>
        </label>
      );
    case "radio":
      return (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">
            {field.name}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {(field.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  checked={value === opt}
                  disabled={field.readOnly}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "dropdown":
    case "optionlist":
      return (
        <Field label={field.name}>
          <Select
            value={typeof value === "string" ? value : ""}
            disabled={field.readOnly}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t.fillForms.noSelection}</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
      );
    default:
      return (
        <Field label={field.name}>
          {field.multiline ? (
            <textarea
              className={`${inputClass} min-h-24`}
              value={typeof value === "string" ? value : ""}
              disabled={field.readOnly}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              className={inputClass}
              value={typeof value === "string" ? value : ""}
              disabled={field.readOnly}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
  }
}

export default function FillForms() {
  const t = useT();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fields, setFields] = useState<FormFieldInfo[] | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError("");
    try {
      const data = await readFileBytes(f);
      const found = await readFormFields(data);
      setFields(found);
      setValues(Object.fromEntries(found.map((fld) => [fld.name, fld.value])));
      setFile(f);
      setBytes(data);
      void saveRecent(f.name, data, null);
    } catch (err) {
      setError(errorText(err, t, t.errors.couldNotRead));
    }
  }

  // Pick up a file handed off from another tool's result screen.
  useEffect(() => {
    const handed = takeHandoff();
    if (handed) void onFiles([handed]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!bytes || !file) return;
    setBusy(true);
    setError("");
    try {
      const out = await fillForm(bytes, values, flatten);
      setResult({ name: `${baseName(file.name)}-filled.pdf`, blob: pdfBlob(out) });
    } catch (err) {
      setError(errorText(err, t, t.fillForms.failed));
    } finally {
      setBusy(false);
    }
  }

  /** Take the loaded file to Sign & Annotate (for forms without real fields). */
  function openInAnnotate() {
    if (!bytes || !file) return;
    setHandoff(file.name, bytes);
    navigate("/annotate");
  }

  function reset() {
    setFile(null);
    setBytes(null);
    setFields(null);
    setValues({});
    setFlatten(false);
    setResult(null);
    setError("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : !file || !fields ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint={t.common.selectOnePdf}
          />
          <ErrorBox>{error}</ErrorBox>
        </div>
      ) : fields.length === 0 ? (
        <Card className="space-y-5">
          <p className="text-sm text-slate-600">{t.fillForms.noFields}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={openInAnnotate}>
              <PenLine className="h-4 w-4" /> {t.fillForms.goAnnotate}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t.common.chooseAnotherFile}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">
            {t.fillForms.fieldsFound(fields.length, file.name)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
              />
            ))}
          </div>
          <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                {t.fillForms.flattenLabel}
              </span>
              <span className="block text-xs text-slate-500">{t.fillForms.flattenHint}</span>
            </span>
          </label>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <TextCursorInput className="h-4 w-4" /> {t.fillForms.action}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t.common.chooseAnotherFile}
            </Button>
          </div>
        </Card>
      )}
    </ToolPage>
  );
}

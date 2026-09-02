import type { ToolId } from "../tools";

/**
 * Privacy-safe product events. The schema deliberately excludes arbitrary
 * strings so filenames, document metadata, contents, passwords, and exact
 * file sizes cannot accidentally enter analytics.
 *
 * No network transport ships by default. A deployment may subscribe to the
 * browser event and forward only this allowlisted payload to a cookieless
 * analytics provider after the owner configures one.
 */
export type ProductEvent =
  | { name: "tool_opened"; tool: ToolId }
  | { name: "file_selected"; tool: ToolId; source: "device" | "recent" }
  | { name: "export_downloaded"; tool: ToolId; output: "single" | "zip" }
  | { name: "workflow_continued"; from: ToolId; to: ToolId }
  | { name: "release_scan_completed"; findingBand: "none" | "review" }
  | { name: "safe_export_created"; verified: boolean }
  | {
      name: "pro_interest_opened";
      placement: "home" | "result";
      tool?: ToolId;
    };

export const PRODUCT_EVENT_NAME = "pdf-toolbox:metric";

export function trackProductEvent(event: ProductEvent): void {
  window.dispatchEvent(new CustomEvent<ProductEvent>(PRODUCT_EVENT_NAME, { detail: event }));
}

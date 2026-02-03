import * as DOMPurify from "dompurify";
import { IInputs, IOutputs } from "./generated/ManifestTypes";

const sanitize = (typeof DOMPurify === "function" ? DOMPurify : (DOMPurify as { default: typeof DOMPurify }).default).sanitize;

/**
 * PCF control that renders HTML content from a bound field in a sandboxed Shadow DOM.
 * Content is sanitized with DOMPurify using a configurable whitelist of allowed tags
 * and attributes to prevent XSS. Supports configurable horizontal overflow and an
 * option to clear the bound field after display.
 */
export class HtmlDisplay implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    /** Root element for the content; lives inside the Shadow DOM. */
    private _messageDiv: HTMLDivElement;
    /** Host element that owns the Shadow Root; provides layout and overflow. */
    private _shadowHost: HTMLDivElement;
    /** Shadow Root used for style/DOM encapsulation (sandboxing). */
    private _shadowRoot: ShadowRoot;
    /** Callback to notify the host that outputs have changed (e.g. when clearing the message). */
    private _notifyOutputChanged: () => void;
    /** When true, getOutputs() will return { message: null } to clear the bound field. */
    private _pendingClearMessage: boolean;

    constructor() {}

    /**
     * Initializes the control: builds Shadow DOM, applies initial content and overflow,
     * and optionally schedules clearing the bound message field.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._pendingClearMessage = false;

        this._shadowHost = document.createElement("div");
        this._shadowRoot = this._shadowHost.attachShadow({ mode: "closed" });

        const messageRaw = context.parameters.message.raw ?? "";
        this._messageDiv = document.createElement("div");
        this._messageDiv.innerHTML = this._sanitizeMessage(context, messageRaw);

        this._applyOverflow(context);
        this._shadowRoot.appendChild(this._messageDiv);
        container.appendChild(this._shadowHost);

        if (this._shouldClearMessageAfterLoad(context) && messageRaw !== "") {
            this._pendingClearMessage = true;
            this._notifyOutputChanged();
        }
    }

    /**
     * Applies overflow and layout from the overflow parameter.
     * Horizontal overflow is configurable; vertical is always visible so the container grows with content.
     */
    private _applyOverflow(context: ComponentFramework.Context<IInputs>): void {
        const overflow = (context.parameters.overflow?.raw ?? "auto").toLowerCase();
        const valid = ["auto", "scroll", "hidden", "visible", "clip"];
        const value = valid.includes(overflow) ? overflow : "auto";
        this._shadowHost.style.overflowX = value;
        this._shadowHost.style.overflowY = "visible";
        this._shadowHost.style.width = "100%";
    }

    /**
     * Updates the view when context (parameters or container size) changes.
     * Refreshes overflow, content, and optionally schedules clearing the message field.
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._applyOverflow(context);
        if (context.parameters.message.raw === null) {
            return;
        }

        const messageRaw = context.parameters.message.raw || "";
        this._messageDiv.innerHTML = this._sanitizeMessage(context, messageRaw);

        if (this._shouldClearMessageAfterLoad(context) && messageRaw !== "") {
            this._pendingClearMessage = true;
            this._notifyOutputChanged();
        }
    }

    /** Returns whether the "clear message after load" configuration is enabled. */
    private _shouldClearMessageAfterLoad(context: ComponentFramework.Context<IInputs>): boolean {
        return context.parameters.clearMessageAfterLoad?.raw === true;
    }

    /**
     * Sanitizes HTML using DOMPurify with the component's configured allowed tags and attributes.
     * Prevents XSS by whitelist-based filtering; all other tags/attributes are stripped.
     */
    private _sanitizeMessage(context: ComponentFramework.Context<IInputs>, html: string): string {
        const tagsRaw = context.parameters.allowedTags?.raw ?? "p,br,b,i,u,strong,em,a,ul,ol,li,table,thead,tbody,tr,th,td";
        const attrsRaw = context.parameters.allowedAttributes?.raw ?? "href";
        const allowedTags = tagsRaw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const allowedAttr = attrsRaw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        return sanitize(html, {
            ALLOWED_TAGS: allowedTags,
            ALLOWED_ATTR: allowedAttr,
            FORCE_BODY: true, // keeps <style> etc. in body so they are not moved to head and dropped from output
        });
    }

    /**
     * Returns current output values for the host.
     * When a clear was requested, returns { message: null } so the bound field is not persisted.
     */
    public getOutputs(): IOutputs {
        if (this._pendingClearMessage) {
            this._pendingClearMessage = false;
            return { message: null } as unknown as IOutputs;
        }
        return {};
    }

    /** Called when the control is destroyed; no cleanup required for this control. */
    public destroy(): void {}
}

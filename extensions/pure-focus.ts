import type { Component } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

class EmptyComponent implements Component {
	render(): string[] {
		return [];
	}

	invalidate(): void {}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;

		ctx.ui.setHeader(() => new EmptyComponent());
		ctx.ui.setFooter(() => new EmptyComponent());
		ctx.ui.setWorkingVisible(false);
		ctx.ui.setWorkingIndicator({ frames: [] });
		ctx.ui.setWorkingMessage("");
		ctx.ui.setHiddenThinkingLabel("");
		ctx.ui.setTitle("pi");
	});
}

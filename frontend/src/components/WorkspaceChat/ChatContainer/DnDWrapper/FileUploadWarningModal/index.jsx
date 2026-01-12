import { CircleNotch } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import pluralize from "pluralize";
import { numberWithCommas } from "@/utils/numbers";
import useUser from "@/hooks/useUser";
import { Link } from "react-router-dom";
import Paths from "@/utils/paths";
import Workspace from "@/models/workspace";

export default function FileUploadWarningModal({
  show,
  onClose,
  onContinue,
  onEmbed,
  tokenCount,
  maxTokens,
  fileCount = 1,
  isEmbedding = false,
  embedProgress = 0,
}) {
  const { user } = useUser();
  const canEmbed = !user || user.role !== "default";
  if (!show) return null;

  if (isEmbedding) {
    return (
      <ModalWrapper isOpen={show}>
        <div className="relative max-w-[600px] bg-theme-bg-primary rounded-lg shadow border border-theme-modal-border">
          <div className="p-6 flex flex-col items-center justify-center">
            <p className="text-white text-lg font-semibold mb-4">
              Embedding {embedProgress + 1} of {fileCount}{" "}
              {pluralize("file", fileCount)}
            </p>
            <CircleNotch size={32} className="animate-spin text-white" />
            <p className="text-white/60 text-sm mt-2">
              Please wait while we embed your files...
            </p>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper isOpen={show}>
      <div className="relative max-w-[600px] bg-theme-bg-primary rounded-lg shadow border border-theme-modal-border">
        <div className="relative p-6 border-b border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              Context Window Warning
            </h3>
          </div>
        </div>

        <div className="py-7 px-9 space-y-4">
  <p className="text-theme-text-primary text-sm leading-relaxed">
    <span className="font-bold text-white block mb-2">Memory Limit Warning 🧠</span>
    This workspace is currently holding <b>{numberWithCommas(tokenCount)}</b> units of information. 
    Think of it like a study guide: if the guide gets too long, it's harder for the AI to find 
    the right answers. 
    <br /><br />
    Adding <b>{fileCount}</b> more {pluralize("file", fileCount)} will make this guide 
    too big to read at once. To keep the AI smart and fast, we recommend 
    <b> "Embedding" </b> these files instead.
  </p>
  
  <p className="text-theme-text-secondary text-xs italic bg-white/5 p-3 rounded-md">
    <b>Student Tip:</b> Embedding turns your files into a searchable library. 
    The AI will only look at the pages it needs instead of trying to memorize the whole book!
  </p>

  <Link
    target="_blank"
    to={Paths.documentation.contextWindows()}
    className="text-theme-text-secondary text-sm underline block mt-2"
  >
    How does AI memory work? &rarr;
  </Link>
</div>

        <div className="flex w-full justify-between items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
          <button
            onClick={onClose}
            type="button"
            className="border-none transition-all duration-300 bg-theme-modal-border text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
          <div className="flex w-full justify-end items-center space-x-2">
            <button
              onClick={onContinue}
              type="button"
              className="border-none transition-all duration-300 bg-theme-modal-border text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm"
            >
              Continue Anyway
            </button>
            {canEmbed && (
              <button
                onClick={onEmbed}
                disabled={isEmbedding || !canEmbed}
                type="button"
                className="border-none transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                Embed {pluralize("File", fileCount)}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

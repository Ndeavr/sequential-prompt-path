import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { publishClaraPageContext, readClaraPageContext } from "@/services/clara/claraPageContext";

/** No raw DOM recording: page metadata and explicitly opted-in numeric fields only. */
export default function ClaraPageContextObserver() {
  const { pathname } = useLocation();
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>;
    let hesitation: ReturnType<typeof setTimeout>;
    const publish = () => publishClaraPageContext(readClaraPageContext(pathname));
    const changed = () => { clearTimeout(debounce); debounce = setTimeout(publish, 450); };
    const editing = () => {
      changed(); clearTimeout(hesitation);
      hesitation = setTimeout(() => publishClaraPageContext(readClaraPageContext(pathname, true)), 20000);
    };
    publish();
    document.addEventListener("focusin", editing); document.addEventListener("input", editing);
    document.addEventListener("change", changed); document.addEventListener("invalid", changed, true);
    const observer = new MutationObserver(changed);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-clara-step", "aria-invalid", "disabled"] });
    return () => {
      clearTimeout(debounce); clearTimeout(hesitation); observer.disconnect();
      document.removeEventListener("focusin", editing); document.removeEventListener("input", editing);
      document.removeEventListener("change", changed); document.removeEventListener("invalid", changed, true);
    };
  }, [pathname]);
  return null;
}

/**
 * Thin wrapper over PrimeIcons — the icon set that ships with the PrimeReact
 * component library. Call sites keep passing the old Material Symbol names; this
 * maps them onto `pi pi-*` classes so the whole product draws from one set.
 */

const ICON_MAP: Record<string, string> = {
  // wayfinding
  dashboard: "th-large",
  folder_open: "folder-open",
  flag: "flag",
  flag_circle: "flag-fill",
  groups: "users",
  group: "users",
  domain: "building",
  menu: "bars",
  menu_book: "book",
  history: "history",
  logout: "sign-out",
  close: "times",
  chevron_right: "chevron-right",
  expand_more: "chevron-down",
  arrow_back: "arrow-left",
  arrow_forward: "arrow-right",
  north_east: "arrow-up-right",
  tune: "sliders-h",
  search: "search",
  // status
  check: "check",
  check_circle: "check-circle",
  hourglass_top: "hourglass",
  schedule: "clock",
  event_busy: "calendar-times",
  warning: "exclamation-triangle",
  error: "exclamation-circle",
  remove: "minus",
  verified: "verified",
  workspace_premium: "verified",
  trending_down: "arrow-down-right",
  public: "globe",
  lock: "lock",
  // actions
  add: "plus",
  edit: "pencil",
  delete: "trash",
  upload: "upload",
  publish: "cloud-upload",
  send: "send",
  undo: "replay",
  rate_review: "comment",
  link: "link",
  attach_file: "paperclip",
  filter_alt_off: "filter-slash",
  dark_mode: "moon",
  light_mode: "sun",
};

export function Icon({
  name,
  className = "",
  fill = false,
}: {
  name: string;
  className?: string;
  /** kept for source compatibility — PrimeIcons has a single weight */
  fill?: boolean;
}) {
  void fill;
  const pi = ICON_MAP[name] ?? name.replace(/_/g, "-");
  return <i aria-hidden="true" className={`pi pi-${pi} ${className}`.trim()} />;
}

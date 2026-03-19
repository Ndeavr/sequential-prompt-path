type PropertyRecord = {
  year_built?: number | null;
  property_type?: string | null;
  square_footage?: number | null;
};

type DocumentRecord = {
  document_type?: string | null;
  extracted_json?: Record<string, unknown> | null;
};

type EventRecord = {
  event_type?: string | null;
  title?: string | null;
  event_date?: string | null;
  metadata?: Record<string, unknown> | null;
};

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  )
    return Number(value);
  return null;
}

function getBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function deriveAnalysisInputs(params: {
  property: PropertyRecord;
  documents: DocumentRecord[];
  events: EventRecord[];
}) {
  const { property, documents, events } = params;

  let roofAge: number | null = null;
  let insulation: "poor" | "average" | "good" | "excellent" | null = null;
  let windowsCondition: "poor" | "average" | "good" | null = null;
  let heatingType: string | null = null;
  let humidityIssue: boolean | undefined = undefined;
  let electricalUpdated: boolean | undefined = undefined;
  let plumbingUpdated: boolean | undefined = undefined;

  for (const doc of documents) {
    const ext = doc.extracted_json ?? {};

    if (roofAge === null) roofAge = getNumber(ext.roof_age);

    if (!insulation && typeof ext.insulation_level === "string") {
      const v = ext.insulation_level;
      if (
        v === "poor" ||
        v === "average" ||
        v === "good" ||
        v === "excellent"
      )
        insulation = v;
    }

    if (!windowsCondition && typeof ext.windows_condition === "string") {
      const v = ext.windows_condition;
      if (v === "poor" || v === "average" || v === "good")
        windowsCondition = v;
    }

    if (!heatingType && typeof ext.heating_type === "string")
      heatingType = ext.heating_type;

    if (humidityIssue === undefined) {
      const v = getBoolean(ext.humidity_issue);
      if (v !== null) humidityIssue = v;
    }

    if (electricalUpdated === undefined) {
      const v = getBoolean(ext.electrical_updated);
      if (v !== null) electricalUpdated = v;
    }

    if (plumbingUpdated === undefined) {
      const v = getBoolean(ext.plumbing_updated);
      if (v !== null) plumbingUpdated = v;
    }
  }

  for (const event of events) {
    const metadata = event.metadata ?? {};

    if (
      event.event_type === "roof_renovation" &&
      roofAge === null &&
      event.event_date
    ) {
      const eventYear = new Date(event.event_date).getFullYear();
      roofAge = new Date().getFullYear() - eventYear;
    }

    if (event.event_type === "electrical_upgrade") electricalUpdated = true;
    if (event.event_type === "plumbing_upgrade") plumbingUpdated = true;
    if (event.event_type === "humidity_issue") humidityIssue = true;

    if (!heatingType && typeof metadata.heating_type === "string")
      heatingType = metadata.heating_type;

    if (!insulation && typeof metadata.insulation_level === "string") {
      const v = metadata.insulation_level;
      if (
        v === "poor" ||
        v === "average" ||
        v === "good" ||
        v === "excellent"
      )
        insulation = v;
    }
  }

  return {
    property: {
      year_built: property.year_built ?? null,
      property_type: property.property_type ?? null,
      square_footage: property.square_footage ?? null,
    },
    derived: {
      roofAge,
      insulation: insulation ?? "average",
      windowsCondition: windowsCondition ?? "average",
      heatingType,
      humidityIssue: humidityIssue ?? false,
      electricalUpdated: electricalUpdated ?? false,
      plumbingUpdated: plumbingUpdated ?? false,
    },
  };
}

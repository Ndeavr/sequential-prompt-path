import { defineMcp } from "@lovable.dev/mcp-js";
import searchContractors from "./tools/search-contractors";
import getContractor from "./tools/get-contractor";
import listCities from "./tools/list-cities";

export default defineMcp({
  name: "unpro-mcp",
  title: "UNPRO — Home Intelligence Platform",
  version: "0.1.0",
  instructions:
    "UNPRO is a Québec home intelligence platform. Use `search_contractors` to find verified contractors by city and trade, `get_contractor` for a full public profile, and `list_cities` to discover served Québec cities. All responses are in French (fr-CA).",
  tools: [searchContractors, getContractor, listCities],
});

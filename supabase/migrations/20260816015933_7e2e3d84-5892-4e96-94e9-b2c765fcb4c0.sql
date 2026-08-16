update external_enrichment_circuit set kill_switch=true where provider='dataforseo';
update provider_circuit_state set kill_switch=true where provider='dataforseo';
/**
 * MCP Client connectors for external health data.
 * Vero consumes data from Apple Health, Google Fit, Google Calendar, Gmail.
 *
 * These are stub implementations — actual MCP client connections
 * require the MCP SDK and configured server endpoints.
 */

export interface HealthDataPoint {
  date: string;
  value: number;
  unit: string;
  source: string;
}

export interface HealthDataQuery {
  data_type: "steps" | "sleep" | "heart_rate" | "activity";
  days: number;
  patient_id?: string;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
}

/**
 * Fetch health data from Apple Health / Google Fit via MCP.
 * Falls back to empty data if MCP server is not configured.
 */
export async function fetchHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
  const mcpEndpoint = process.env.HEALTH_MCP_ENDPOINT;

  if (!mcpEndpoint) {
    // Return placeholder data indicating MCP is not configured
    return [{
      date: new Date().toISOString(),
      value: 0,
      unit: query.data_type === "steps" ? "steps" : query.data_type === "sleep" ? "hours" : "bpm",
      source: "mcp_not_configured",
    }];
  }

  try {
    const response = await fetch(mcpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: `get_${query.data_type}`,
        input: { days: query.days },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.result ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch upcoming calendar events for scheduling awareness.
 */
export async function fetchCalendarEvents(days: number = 7): Promise<CalendarEvent[]> {
  const mcpEndpoint = process.env.CALENDAR_MCP_ENDPOINT;
  if (!mcpEndpoint) return [];

  try {
    const response = await fetch(mcpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "list_events",
        input: { days },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.result ?? [];
  } catch {
    return [];
  }
}

/**
 * Check if health MCP is available.
 */
export function isHealthMCPAvailable(): boolean {
  return !!process.env.HEALTH_MCP_ENDPOINT;
}

/**
 * Check if calendar MCP is available.
 */
export function isCalendarMCPAvailable(): boolean {
  return !!process.env.CALENDAR_MCP_ENDPOINT;
}

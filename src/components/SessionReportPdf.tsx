import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { SessionReport } from "@/agents/sessionReport";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#4b5563",
  },
  muted: {
    fontSize: 10,
    color: "#6b7280",
  },
  scoreBlock: {
    alignItems: "flex-end",
  },
  scoreLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#111827",
  },
  paragraph: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletMark: {
    width: 10,
    color: "#0f766e",
  },
  bulletBody: {
    flex: 1,
    fontSize: 11,
    color: "#374151",
  },
  outcomeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  outcomeCell: {
    width: "50%",
    marginBottom: 8,
  },
  outcomeLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
  },
  outcomeValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    fontSize: 9,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function SessionReportPdf({ report }: { report: SessionReport }) {
  const generated = new Date().toLocaleString();

  return (
    <Document
      title={report.title}
      author="Vero AI Physical Therapy"
      subject={`Session report for ${report.patient_name}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{report.title}</Text>
            <Text style={styles.subtitle}>
              {report.patient_name}
              {report.session_number != null
                ? ` — Session ${report.session_number}`
                : ""}
            </Text>
            <Text style={styles.muted}>{formatDate(report.date)}</Text>
          </View>
          {report.overall_score != null && (
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreLabel}>Overall Score</Text>
              <Text style={styles.scoreValue}>{report.overall_score}</Text>
            </View>
          )}
        </View>

        {report.sections.map((section, idx) => (
          <View key={idx} style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.content.split("\n").map((line, lIdx) =>
              line.trim().length > 0 ? (
                <Text key={lIdx} style={styles.paragraph}>
                  {line}
                </Text>
              ) : null,
            )}
          </View>
        ))}

        {report.outcome_measure && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>Outcome Measure</Text>
            <View style={styles.outcomeGrid}>
              <View style={styles.outcomeCell}>
                <Text style={styles.outcomeLabel}>Instrument</Text>
                <Text style={styles.outcomeValue}>
                  {report.outcome_measure.instrument}
                </Text>
              </View>
              <View style={styles.outcomeCell}>
                <Text style={styles.outcomeLabel}>Current Score</Text>
                <Text style={styles.outcomeValue}>
                  {report.outcome_measure.current_score}
                </Text>
              </View>
              <View style={styles.outcomeCell}>
                <Text style={styles.outcomeLabel}>Change</Text>
                <Text style={styles.outcomeValue}>
                  {report.outcome_measure.change > 0 ? "+" : ""}
                  {report.outcome_measure.change}
                </Text>
              </View>
              <View style={styles.outcomeCell}>
                <Text style={styles.outcomeLabel}>MCID Reached</Text>
                <Text style={styles.outcomeValue}>
                  {report.outcome_measure.mcid_achieved ? "Yes" : "Not yet"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {report.recommendations.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>Recommendations</Text>
            {report.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletBody}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Vero AI Physical Therapy</Text>
          <Text>Generated {generated}</Text>
        </View>
      </Page>
    </Document>
  );
}

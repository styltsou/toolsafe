import { TOOLSAFE_VERSION } from '@/core/constants';
import type { AnalysisResult, FindingSeverity, Rule } from '@/core/types';
import { defaultRules } from '@/rules';

type SarifLog = {
  $schema: string;
  version: string;
  runs: SarifRun[];
};

type SarifRun = {
  tool: SarifTool;
  results: SarifResult[];
};

type SarifTool = {
  driver: SarifDriver;
};

type SarifDriver = {
  name: string;
  version: string;
  informationUri: string;
  rules: SarifRule[];
};

type SarifRule = {
  id: string;
  name: string;
  shortDescription: SarifMessage;
  fullDescription: SarifMessage;
  defaultConfiguration: {
    level: SarifLevel;
  };
  helpUri?: string;
};

type SarifResult = {
  ruleId: string;
  ruleIndex: number;
  level: SarifLevel;
  message: SarifMessage;
  locations: SarifLocation[];
  properties?: Record<string, unknown>;
};

type SarifMessage = {
  text: string;
};

type SarifLocation = {
  physicalLocation: {
    artifactLocation: {
      uri: string;
    };
    region?: {
      startLine?: number;
      snippet?: {
        text: string;
      };
    };
  };
};

type SarifLevel = 'error' | 'warning' | 'note';

function toSarifLevel(severity: FindingSeverity): SarifLevel {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'note';
  }
}

function buildRulesIndex(rules: Rule[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const [i, rule] of rules.entries()) {
    index.set(rule.id, i);
  }
  return index;
}

export function renderSarifReport(result: AnalysisResult): string {
  const uri = result.input.filePath;
  const rules = defaultRules;
  const ruleIndex = buildRulesIndex(rules);

  const sarifRules: SarifRule[] = rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    shortDescription: { text: rule.description },
    fullDescription: { text: rule.description },
    defaultConfiguration: {
      level: toSarifLevel(rule.defaultSeverity),
    },
  }));

  const sarifResults: SarifResult[] = result.findings.map((finding) => {
    const index = ruleIndex.get(finding.ruleId) ?? -1;
    const message =
      finding.evidence && finding.evidence.length > 0
        ? `${finding.message}\n\nRecommendation: ${finding.recommendation}\n\nEvidence:\n${finding.evidence.map((e) => `  - ${e}`).join('\n')}`
        : `${finding.message}\n\nRecommendation: ${finding.recommendation}`;

    return {
      ruleId: finding.ruleId,
      ruleIndex: index,
      level: toSarifLevel(finding.severity),
      message: { text: message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri },
            region: {
              snippet: { text: `${finding.method} ${finding.path}` },
            },
          },
        },
      ],
      properties: {
        category: finding.category,
        toolId: finding.toolId,
        toolName: finding.toolName,
        method: finding.method,
        path: finding.path,
      },
    };
  });

  const sarifLog: SarifLog = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ToolSafe',
            version: TOOLSAFE_VERSION,
            informationUri: 'https://github.com/styltsou/toolsafe',
            rules: sarifRules,
          },
        },
        results: sarifResults,
      },
    ],
  };

  return `${JSON.stringify(sarifLog, null, 2)}\n`;
}

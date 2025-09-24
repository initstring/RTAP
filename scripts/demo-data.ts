import "dotenv/config";
import {
  PrismaClient,
  ToolType,
  OperationStatus,
  OutcomeType,
  OutcomeStatus,
} from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.findFirst();
  if (!user) {
    throw new Error("No users found. Create a user before seeding demo data.");
  }

  const taxonomy = await seedTaxonomy();
  await seedOperations({ userId: user.id, ...taxonomy });

  console.log("Demo data loaded");
}

async function seedTaxonomy() {
  const cat = {} as Record<string, string>;

  const defCats = ["EDR", "SIEM", "Network Monitoring"];
  const offCats = ["C2", "Phishing", "Exploitation"];

  for (const name of defCats) {
    const c = await db.toolCategory.upsert({
      where: { name_type: { name, type: ToolType.DEFENSIVE } },
      update: {},
      create: { name, type: ToolType.DEFENSIVE },
    });
    cat[name] = c.id;
  }
  for (const name of offCats) {
    const c = await db.toolCategory.upsert({
      where: { name_type: { name, type: ToolType.OFFENSIVE } },
      update: {},
      create: { name, type: ToolType.OFFENSIVE },
    });
    cat[name] = c.id;
  }

  const tools = {} as Record<string, string>;
  const toolDefs: Array<{ name: string; type: ToolType; cat: string }> = [
    { name: "CrowdStrike Falcon", type: ToolType.DEFENSIVE, cat: "EDR" },
    { name: "Microsoft Defender", type: ToolType.DEFENSIVE, cat: "EDR" },
    { name: "Splunk", type: ToolType.DEFENSIVE, cat: "SIEM" },
    { name: "Wazuh", type: ToolType.DEFENSIVE, cat: "SIEM" },
    { name: "Zeek", type: ToolType.DEFENSIVE, cat: "Network Monitoring" },
    { name: "Cobalt Strike", type: ToolType.OFFENSIVE, cat: "C2" },
    { name: "Metasploit", type: ToolType.OFFENSIVE, cat: "Exploitation" },
    { name: "Phishing Frenzy", type: ToolType.OFFENSIVE, cat: "Phishing" },
    { name: "Nmap", type: ToolType.OFFENSIVE, cat: "Exploitation" },
    { name: "Empire", type: ToolType.OFFENSIVE, cat: "C2" },
  ];
  for (const t of toolDefs) {
    const tool = await db.tool.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name, type: t.type, categoryId: cat[t.cat]! },
    });
    tools[t.name] = tool.id;
  }

  const logSources = {} as Record<string, string>;
  for (const name of ["Sysmon", "Windows Event Log", "Firewall Logs"]) {
    const ls = await db.logSource.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} source` },
    });
    logSources[name] = ls.id;
  }

  const targets = {} as Record<string, string>;
  const targetDefs: Array<{ name: string; description: string; isCrownJewel: boolean }> = [
    { name: "Customer Database", description: "Primary production customer data store", isCrownJewel: true },
    { name: "Source Code Repository", description: "Core application source control", isCrownJewel: true },
    { name: "Payment Processing System", description: "Systems handling card payments", isCrownJewel: true },
    { name: "Email Server", description: "Corporate email infrastructure", isCrownJewel: true },
    { name: "HR Records", description: "Sensitive employee data store", isCrownJewel: true },
    { name: "Employee Credentials", description: "Employee identity and password vault", isCrownJewel: false },
    { name: "Employee Endpoint", description: "Standard employee workstation image", isCrownJewel: false },
    { name: "Application Access Token", description: "Service-to-service OAuth token", isCrownJewel: false },
  ];
  for (const target of targetDefs) {
    const record = await db.target.upsert({
      where: { name: target.name },
      update: { description: target.description, isCrownJewel: target.isCrownJewel },
      create: target,
    });
    targets[target.name] = record.id;
  }

  const tags = {} as Record<string, string>;
  for (const name of ["Stealth", "Opportunistic", "Purple Team"]) {
    const tag = await db.tag.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} tag` },
    });
    tags[name] = tag.id;
  }

  const threatActors = {} as Record<string, { id: string }>;
  const actorDefs = [
    {
      name: "APT29",
      topThreat: true,
      description: "Russian intelligence service threat actor.",
      techniques: [
        "T1566",
        "T1059",
        "T1105",
        "T1082",
        "T1057",
        "T1053",
        "T1021",
        "T1107",
        "T1041",
        "T1497",
      ],
    },
    {
      name: "FIN7",
      topThreat: false,
      description: "Financially motivated group targeting payment data.",
      techniques: [
        "T1189",
        "T1055",
        "T1070",
        "T1003",
        "T1036",
        "T1046",
        "T1027",
        "T1219",
        "T1048",
        "T1562",
      ],
    },
    {
      name: "Lazarus Group",
      topThreat: false,
      description: "North Korean state-sponsored group.",
      techniques: [
        "T1190",
        "T1204",
        "T1050",
        "T1490",
        "T1030",
        "T1499",
        "T1106",
        "T1569",
        "T1486",
        "T1020",
      ],
    },
  ];
  for (const a of actorDefs) {
    const actor = await db.threatActor.upsert({
      where: { name: a.name },
      update: {},
      create: {
        name: a.name,
        description: a.description,
        topThreat: a.topThreat,
        mitreTechniques: { connect: a.techniques.map((id) => ({ id })) },
      },
    });
    threatActors[a.name] = { id: actor.id };
  }

  return { tools, logSources, targets, threatActors, tags };
}

interface SeedCtx {
  userId: string;
  tools: Record<string, string>;
  logSources: Record<string, string>;
  targets: Record<string, string>;
  threatActors: Record<string, { id: string }>;
  tags: Record<string, string>;
}

interface OutcomeSeed {
  type: OutcomeType;
  status: OutcomeStatus;
  detection?: string | null;
  notes: string;
  tools: string[];
  logs: string[];
  log?: string | null;
}

interface TechniqueTargetSeed {
  name: string;
  status?: "succeeded" | "failed" | "unknown";
}

interface TechniqueSeed {
  mitre: string;
  desc: string;
  start?: string;
  end?: string;
  source?: string;
  target?: string;
  tools: string[];
  outcome?: OutcomeSeed;
  executedSuccessfully?: boolean;
  targets?: TechniqueTargetSeed[];
}

interface OperationSeed {
  name: string;
  description: string;
  status: OperationStatus;
  threatActor?: string;
  start: Date;
  end: Date | null;
  targets: string[];
  tags: string[];
  techniques: TechniqueSeed[];
}

async function seedOperations(ctx: SeedCtx) {
  const { userId, tools, logSources, targets, threatActors, tags } = ctx;

  const operations: OperationSeed[] = [
    {
      name: "Operation Silent Spear",
      description: "Simulated spear-phishing campaign modeled on APT29.",
      status: OperationStatus.COMPLETED,
      threatActor: threatActors.APT29!.id,
      start: new Date("2025-01-05T08:00:00Z"),
      end: new Date("2025-02-15T16:00:00Z"),
      targets: ["Email Server", "Payment Processing System", "Employee Credentials"],
      tags: ["Stealth"],
      techniques: [
        {
          mitre: "T1566",
          desc: "Phishing email to outdated address",
          start: "2025-02-10T08:00:00Z",
          end: "2025-02-10T08:05:00Z",
          source: "203.0.113.5",
          target: "FinanceMail01",
          tools: ["Phishing Frenzy"],
          executedSuccessfully: false,
        },
        {
          mitre: "T1566",
          desc: "Spear-phishing email to finance staff",
          start: "2025-02-10T08:10:00Z",
          end: "2025-02-10T08:25:00Z",
          source: "203.0.113.5",
          target: "FinanceMail01",
          tools: ["Phishing Frenzy"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-02-10T08:36:00Z",
            notes: "Email filtered by Microsoft Defender.",
            tools: ["Microsoft Defender"],
            logs: ["Windows Event Log"],
            log: "AlertID=phish-771",
          },
        },
        {
          mitre: "T1059",
          desc: "PowerShell stager executed",
          start: "2025-02-10T09:00:00Z",
          end: "2025-02-10T09:05:00Z",
          source: "203.0.113.5",
          target: "Workstation-23",
          tools: ["Empire"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "No alerts generated.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1105",
          desc: "Transferred payload via C2",
          start: "2025-02-10T09:10:00Z",
          end: "2025-02-10T09:15:00Z",
          source: "203.0.113.5",
          target: "Workstation-23",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-02-10T09:16:00Z",
            notes: "Cobalt Strike beacon noted.",
            tools: ["CrowdStrike Falcon"],
            logs: ["Sysmon"],
            log: "EventID=3 connection alert",
          },
        },
        {
          mitre: "T1082",
          desc: "System information discovery",
          start: "2025-02-10T09:20:00Z",
          end: "2025-02-10T09:25:00Z",
          source: "203.0.113.5",
          target: "Workstation-23",
          tools: ["Nmap"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.ATTRIBUTION,
            status: OutcomeStatus.ATTRIBUTED,
            detection: "2025-02-14T09:30:00Z",
            notes: "Indicators linked activity to APT29.",
            tools: ["CrowdStrike Falcon"],
            logs: ["Sysmon"],
            log: "EventID=1 process audit",
          },
        },
        {
          mitre: "T1041",
          desc: "Exfiltration over C2 channel",
          start: "2025-02-12T15:00:00Z",
          end: "2025-02-12T15:30:00Z",
          source: "203.0.113.5",
          target: "PaymentServer1",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          targets: [
            { name: "Payment Processing System", status: "succeeded" },
          ],
          outcome: {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detection: "2025-02-12T15:31:00Z",
            notes: "Egress blocked by Zeek.",
            tools: ["Zeek"],
            logs: ["Firewall Logs"],
            log: "Outbound C2 traffic blocked",
          },
        },
      ],
    },
    {
      name: "Operation Nightfall",
      description: "Drive-by compromise exercise based on FIN7.",
      status: OperationStatus.COMPLETED,
      threatActor: threatActors.FIN7!.id,
      start: new Date("2025-02-15T10:00:00Z"),
      end: new Date("2025-05-15T18:00:00Z"),
      targets: ["Payment Processing System", "Employee Endpoint"],
      tags: ["Opportunistic"],
      techniques: [
        {
          mitre: "T1189",
          desc: "Malicious content served but page closed",
          start: "2025-05-05T10:00:00Z",
          end: "2025-05-05T10:03:00Z",
          source: "198.51.100.7",
          target: "WebServer1",
          tools: ["Metasploit"],
          executedSuccessfully: false,
        },
        {
          mitre: "T1189",
          desc: "Malicious web content served",
          start: "2025-05-05T10:05:00Z",
          end: "2025-05-05T10:15:00Z",
          source: "198.51.100.7",
          target: "WebServer1",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detection: "2025-05-05T10:21:00Z",
            notes: "Web filter blocked exploit.",
            tools: ["Wazuh"],
            logs: ["Firewall Logs"],
            log: "Blocked request from 198.51.100.7",
          },
        },
        {
          mitre: "T1055",
          desc: "Process injection into svchost",
          start: "2025-05-05T11:00:00Z",
          end: "2025-05-05T11:05:00Z",
          source: "198.51.100.7",
          target: "AppServer2",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "No alert generated.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1003",
          desc: "Dumped LSASS memory",
          start: "2025-05-05T11:10:00Z",
          end: "2025-05-05T11:12:00Z",
          source: "198.51.100.7",
          target: "AppServer2",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.ATTRIBUTION,
            status: OutcomeStatus.ATTRIBUTED,
            detection: "2025-05-10T11:13:00Z",
            notes: "Technique linked to FIN7 toolkit.",
            tools: ["CrowdStrike Falcon"],
            logs: ["Sysmon"],
            log: "EventID=10 lsass access",
          },
        },
        {
          mitre: "T1048",
          desc: "Exfiltration over SMTP",
          start: "2025-05-07T16:00:00Z",
          end: "2025-05-07T16:20:00Z",
          source: "198.51.100.7",
          target: "PaymentServer1",
          tools: ["Nmap"],
          executedSuccessfully: true,
          targets: [
            { name: "Payment Processing System", status: "failed" },
          ],
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-05-07T16:21:00Z",
            notes: "Outbound SMTP blocked.",
            tools: ["Zeek"],
            logs: ["Firewall Logs"],
            log: "Outbound SMTP connection denied",
          },
        },
        {
          mitre: "T1562",
          desc: "Disabled security tools",
          start: "2025-05-07T16:30:00Z",
          end: "2025-05-07T16:35:00Z",
          source: "198.51.100.7",
          target: "AppServer2",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "Tampering not detected.",
            tools: [],
            logs: [],
            log: null,
          },
        },
      ],
    },
    {
      name: "Operation Blue Frost",
      description: "Intrusion scenario reflecting Lazarus Group tradecraft.",
      status: OperationStatus.COMPLETED,
      threatActor: threatActors["Lazarus Group"]!.id,
      start: new Date("2024-08-01T09:00:00Z"),
      end: new Date("2025-01-31T17:00:00Z"),
      targets: ["Source Code Repository", "Application Access Token"],
      tags: ["Purple Team"],
      techniques: [
        {
          mitre: "T1190",
          desc: "Exploited public-facing application",
          start: "2024-11-10T09:00:00Z",
          end: "2024-11-10T09:10:00Z",
          source: "203.0.113.9",
          target: "PortalServer",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detection: "2024-11-10T09:11:00Z",
            notes: "WAF blocked exploit.",
            tools: ["Wazuh"],
            logs: ["Firewall Logs"],
            log: "WAF rule match 4002",
          },
        },
        {
          mitre: "T1050",
          desc: "Installed new service for persistence",
          start: "2024-11-10T09:30:00Z",
          end: "2024-11-10T09:35:00Z",
          source: "203.0.113.9",
          target: "PortalServer",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "Service creation not logged.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1030",
          desc: "Reduced transfer size to evade detection",
          start: "2024-11-13T15:00:00Z",
          end: "2024-11-13T15:10:00Z",
          source: "203.0.113.9",
          target: "RepoServer1",
          tools: ["Nmap"],
          executedSuccessfully: true,
          targets: [
            { name: "Source Code Repository", status: "succeeded" },
          ],
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "Small transfers evaded monitoring.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1486",
          desc: "Encrypted source code for impact",
          start: "2024-11-13T16:00:00Z",
          end: "2024-11-13T16:30:00Z",
          source: "203.0.113.9",
          target: "RepoServer1",
          tools: ["Empire"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.ATTRIBUTION,
            status: OutcomeStatus.ATTRIBUTED,
            detection: "2024-11-20T16:31:00Z",
            notes: "Ransomware signature matched Lazarus Group.",
            tools: ["CrowdStrike Falcon"],
            logs: ["Sysmon"],
            log: "File encryption pattern observed",
          },
        },
        {
          mitre: "T1020",
          desc: "Automated exfiltration",
          start: "2024-11-13T16:40:00Z",
          end: "2024-11-13T16:50:00Z",
          source: "203.0.113.9",
          target: "RepoServer1",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "No network alert raised.",
            tools: [],
            logs: [],
            log: null,
          },
        },
      ],
    },
    {
      name: "Operation Rogue Wave",
      description:
        "Unattributed breach simulation with extended technique chain.",
      status: OperationStatus.COMPLETED,
      start: new Date("2025-04-01T08:00:00Z"),
      end: new Date("2025-07-31T18:00:00Z"),
      targets: ["Customer Database", "HR Records", "Employee Credentials"],
      tags: ["Stealth"],
      techniques: [
        {
          mitre: "T1195",
          desc: "Compromised software supply chain",
          start: "2025-07-01T08:00:00Z",
          end: "2025-07-01T08:20:00Z",
          source: "192.0.2.10",
          target: "BuildServer",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-07-01T08:21:00Z",
            notes: "Build anomaly flagged.",
            tools: ["Wazuh"],
            logs: ["Sysmon"],
            log: "Unexpected package signature",
          },
        },
        {
          mitre: "T1203",
          desc: "Client execution via exploit",
          start: "2025-07-01T09:00:00Z",
          end: "2025-07-01T09:05:00Z",
          source: "192.0.2.10",
          target: "Client1",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "Exploit went unseen.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1056",
          desc: "Keylogging on client",
          start: "2025-07-01T09:10:00Z",
          end: "2025-07-01T09:40:00Z",
          source: "192.0.2.10",
          target: "Client1",
          tools: ["Empire"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "No keylogging alerts.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1110",
          desc: "Brute force credential attack",
          start: "2025-07-02T10:00:00Z",
          end: "2025-07-02T10:30:00Z",
          source: "192.0.2.10",
          target: "AuthServer",
          tools: ["Nmap"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detection: "2025-07-02T10:31:00Z",
            notes: "Firewall blocked repeated logins.",
            tools: ["Zeek"],
            logs: ["Firewall Logs"],
            log: "Brute force alert",
          },
        },
        {
          mitre: "T1078",
          desc: "Logged in using valid credentials",
          start: "2025-07-02T11:00:00Z",
          end: "2025-07-02T11:05:00Z",
          source: "192.0.2.10",
          target: "AuthServer",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-07-02T11:06:00Z",
            notes: "Login from unusual IP.",
            tools: ["CrowdStrike Falcon"],
            logs: ["Sysmon"],
            log: "New session created",
          },
        },
        {
          mitre: "T1098",
          desc: "Added user to admin group",
          start: "2025-07-02T11:10:00Z",
          end: "2025-07-02T11:12:00Z",
          source: "192.0.2.10",
          target: "DomainController",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "Privilege change missed.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1058",
          desc: "Executed service as a new user",
          start: "2025-07-03T08:00:00Z",
          end: "2025-07-03T08:05:00Z",
          source: "192.0.2.10",
          target: "AppServer3",
          tools: ["Empire"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detection: null,
            notes: "No service execution alert.",
            tools: [],
            logs: [],
            log: null,
          },
        },
        {
          mitre: "T1071",
          desc: "C2 over HTTPS",
          start: "2025-07-03T09:00:00Z",
          end: "2025-07-03T09:30:00Z",
          source: "192.0.2.10",
          target: "AppServer3",
          tools: ["Cobalt Strike"],
          executedSuccessfully: true,
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-07-03T09:31:00Z",
            notes: "Unusual outbound HTTPS traffic.",
            tools: ["Zeek"],
            logs: ["Firewall Logs"],
            log: "C2 pattern detected",
          },
        },
        {
          mitre: "T1029",
          desc: "Scheduled data transfer",
          start: "2025-07-04T14:00:00Z",
          end: "2025-07-04T14:10:00Z",
          source: "192.0.2.10",
          target: "DBServer1",
          tools: ["Nmap"],
          executedSuccessfully: true,
          targets: [
            { name: "Customer Database", status: "failed" },
          ],
          outcome: {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detection: "2025-07-04T14:11:00Z",
            notes: "Scheduled task flagged.",
            tools: ["Wazuh"],
            logs: ["Sysmon"],
            log: "Suspicious task creation",
          },
        },
        {
          mitre: "T1040",
          desc: "Network sniffing for credentials",
          start: "2025-07-04T15:00:00Z",
          end: "2025-07-04T15:30:00Z",
          source: "192.0.2.10",
          target: "HRServer",
          tools: ["Metasploit"],
          executedSuccessfully: true,
          targets: [
            { name: "Employee Credentials", status: "succeeded" },
          ],
          outcome: {
            type: OutcomeType.ATTRIBUTION,
            status: OutcomeStatus.ATTRIBUTED,
            detection: "2025-07-10T15:31:00Z",
            notes: "Sniffing traced to actor infrastructure.",
            tools: ["Zeek"],
            logs: ["Firewall Logs"],
            log: "Packet capture matched IOC",
          },
        },
      ],
    },
    {
      name: "Operation Cold Start",
      description: "Planned assessment targeting source control.",
      status: OperationStatus.PLANNING,
      start: new Date("2025-06-01T00:00:00Z"),
      end: null,
      targets: ["Source Code Repository", "Employee Credentials"],
      tags: ["Purple Team"],
      techniques: [
        {
          mitre: "T1497",
          desc: "Virtualization/sandbox evasion",
          tools: ["Empire"],
        },
        {
          mitre: "T1107",
          desc: "File deletion after execution",
          tools: ["Cobalt Strike"],
        },
        {
          mitre: "T1070",
          desc: "Clear Windows Event Logs",
          tools: ["Metasploit"],
        },
        { mitre: "T1046", desc: "Network service scanning", tools: ["Nmap"] },
        {
          mitre: "T1490",
          desc: "Inhibit system recovery",
          tools: ["Cobalt Strike"],
        },
        { mitre: "T1569", desc: "System services abuse", tools: ["Empire"] },
        {
          mitre: "T1219",
          desc: "Remote access software",
          tools: ["Cobalt Strike"],
        },
        { mitre: "T1489", desc: "Data destruction", tools: ["Metasploit"] },
        { mitre: "T1027", desc: "Obfuscated/packed files", tools: ["Empire"] },
        {
          mitre: "T1068",
          desc: "Exploitation for privilege escalation",
          tools: ["Metasploit"],
        },
      ],
    },
  ];

  for (const op of operations) {
    await db.operation.create({
      data: {
        name: op.name,
        description: op.description,
        status: op.status,
        startDate: op.start,
        endDate: op.end,
        createdById: userId,
        threatActorId: op.threatActor ?? undefined,
        targets: {
          connect: op.targets.map((n) => ({ id: targets[n] })),
        },
        tags: {
          connect: op.tags.map((n) => ({ id: tags[n] })),
        },
        techniques: {
          create: op.techniques.map((t, idx) => ({
            description: t.desc,
            sortOrder: idx + 1,
            startTime: t.start ? new Date(t.start) : null,
            endTime: t.end ? new Date(t.end) : null,
            sourceIp: t.source,
            targetSystem: t.target,
            mitreTechnique: { connect: { id: t.mitre } },
            tools: { connect: t.tools.map((n) => ({ id: tools[n] })) },
            executedSuccessfully: t.executedSuccessfully ?? undefined,
            targetEngagements: t.targets && t.targets.length > 0
              ? {
                  create: t.targets.map((targetSeed) => ({
                    target: { connect: { id: targets[targetSeed.name] } },
                    wasSuccessful:
                      targetSeed.status === undefined || targetSeed.status === "unknown"
                        ? null
                        : targetSeed.status === "succeeded",
                  })),
                }
              : undefined,
            outcomes: t.outcome
              ? {
                  create: {
                    type: t.outcome.type,
                    status: t.outcome.status,
                    detectionTime: t.outcome.detection
                      ? new Date(t.outcome.detection)
                      : null,
                    notes: t.outcome.notes,
                    logData: t.outcome.log ?? undefined,
                    tools: {
                      connect: t.outcome.tools.map((n) => ({ id: tools[n] })),
                    },
                    logSources: {
                      connect: t.outcome.logs.map((n) => ({
                        id: logSources[n],
                      })),
                    },
                  },
                }
              : undefined,
          })),
        },
      },
    });
  }

  await ensureOutcomeCoverage(ctx);
}

async function ensureOutcomeCoverage(ctx: SeedCtx) {
  const { tools, logSources } = ctx;
  const techniques = await db.technique.findMany({
    include: {
      outcomes: true,
      operation: { select: { startDate: true, createdAt: true, status: true } },
    },
  });

  const detectionCycle = [
    OutcomeStatus.DETECTED,
    OutcomeStatus.MISSED,
    OutcomeStatus.DETECTED,
    OutcomeStatus.MISSED,
    OutcomeStatus.DETECTED,
    OutcomeStatus.NOT_APPLICABLE,
  ];
  const preventionCycle = [
    OutcomeStatus.PREVENTED,
    OutcomeStatus.MISSED,
    OutcomeStatus.PREVENTED,
    OutcomeStatus.PREVENTED,
    OutcomeStatus.MISSED,
    OutcomeStatus.NOT_APPLICABLE,
  ];
  const attributionCycle = [
    OutcomeStatus.ATTRIBUTED,
    OutcomeStatus.MISSED,
    OutcomeStatus.ATTRIBUTED,
    OutcomeStatus.NOT_APPLICABLE,
    OutcomeStatus.ATTRIBUTED,
    OutcomeStatus.MISSED,
  ];

  const toolIds = Object.values(tools);
  const logIds = Object.values(logSources);
  let i = 0;
  for (const tech of techniques) {
    if (tech.operation.status === OperationStatus.PLANNING) {
      continue;
    }
    const types = new Set(tech.outcomes.map((o) => o.type));
    const base = tech.startTime
      ? new Date(tech.startTime)
      : new Date(tech.operation.startDate ?? tech.operation.createdAt);
    const detectTime = new Date(base.getTime() + ((i % 5) + 1) * 2 * 60 * 1000);

    if (!types.has(OutcomeType.DETECTION)) {
      const status = detectionCycle[i % detectionCycle.length]!;
      await db.outcome.create({
        data: {
          techniqueId: tech.id,
          type: OutcomeType.DETECTION,
          status,
          detectionTime: status === OutcomeStatus.NOT_APPLICABLE ? null : detectTime,
          notes:
            status === OutcomeStatus.DETECTED
              ? "Activity detected by security tooling"
              : status === OutcomeStatus.MISSED
                ? "No detection occurred"
                : "Detection not assessed",
          tools: { connect: [{ id: toolIds[i % toolIds.length] }] },
          logSources: { connect: [{ id: logIds[i % logIds.length] }] },
        },
      });
    }

    if (!types.has(OutcomeType.PREVENTION)) {
      const status = preventionCycle[i % preventionCycle.length]!;
      await db.outcome.create({
        data: {
          techniqueId: tech.id,
          type: OutcomeType.PREVENTION,
          status,
          detectionTime:
            status === OutcomeStatus.NOT_APPLICABLE
              ? null
              : new Date(detectTime.getTime() + ((i % 3) + 1) * 5 * 60 * 1000),
          notes:
            status === OutcomeStatus.PREVENTED
              ? "Action blocked by controls"
              : status === OutcomeStatus.MISSED
                ? "Preventive controls failed"
                : "Prevention not assessed",
          tools: { connect: [{ id: toolIds[(i + 1) % toolIds.length] }] },
          logSources: { connect: [{ id: logIds[(i + 1) % logIds.length] }] },
        },
      });
    }

    if (!types.has(OutcomeType.ATTRIBUTION)) {
      const status = attributionCycle[i % attributionCycle.length]!;
      await db.outcome.create({
        data: {
          techniqueId: tech.id,
          type: OutcomeType.ATTRIBUTION,
          status,
          detectionTime:
            status === OutcomeStatus.NOT_APPLICABLE
              ? null
              : new Date(detectTime.getTime() + ((i % 4) + 1) * 24 * 60 * 60 * 1000),
          notes:
            status === OutcomeStatus.ATTRIBUTED
              ? "Activity linked to known actor"
              : status === OutcomeStatus.MISSED
                ? "No attribution available"
                : "Attribution not assessed",
          tools: { connect: [{ id: toolIds[(i + 2) % toolIds.length] }] },
          logSources: { connect: [{ id: logIds[(i + 2) % logIds.length] }] },
        },
      });
    }

    i++;
  }
}

void main().finally(() => {
  void db.$disconnect();
});

import { Org, Project } from '../../generated/org';
import { createFromJSON, DepGraph, DepGraphData } from '@snyk/dep-graph';

interface IssuesWithVulnsPaths {
  issues: {
    pkgVersions: { [key: string]: Array<Array<string>> };
  }[];
}

export type AggregatedIssuesWithVulnPaths = IssuesWithVulnsPaths &
  Project.AggregatedissuesPostResponseType;

export const getAggregatedIssuesWithVulnPaths = async (
  classContext: Object,
  body: Project.AggregatedissuesPostBodyType,
): Promise<AggregatedIssuesWithVulnPaths> => {
  const projectAggregatedIssues = await new Org({
    orgId: Object(classContext)['orgId'],
  })
    .project({ projectId: Object(classContext)['projectId'] })
    .aggregatedissues.post(body);

  const projectDepGraph = await new Org({
    orgId: Object(classContext)['orgId'],
  })
    .project({ projectId: Object(classContext)['projectId'] })
    .depgraph.get();

  const depGraph = createFromJSON(projectDepGraph.depGraph as DepGraphData);
  let returnData: AggregatedIssuesWithVulnPaths = {
    issues: [],
  };

  // @ts-ignore
  projectAggregatedIssues.issues.map((issue) => {
    // @ts-ignore
    const versionsWithVulnPaths = issue.pkgVersions.map((version) => {
      const pkg = {
        name: issue.pkgName,
        version: version as string,
      };
      const returnData = {
        [`${pkg.version}`]: getVulnPathsForPkgVersionFromGraph(
          pkg.name,
          pkg.version,
          depGraph,
        ),
      };
      return returnData;
    });

    const newIssue = {
      ...issue,
    };
    newIssue.pkgVersions = versionsWithVulnPaths;
    returnData.issues.push(newIssue);
  });

  return returnData;
};

const getVulnPathsForPkgVersionFromGraph = (
  pkgName: string,
  version: string,
  depGraph: DepGraph,
): Array<Array<string>> => {
  const pkg = {
    name: pkgName,
    version: version,
  };
  const pkgVulnPaths = depGraph.pkgPathsToRoot(pkg) as Array<
    Array<{ name: string; version?: string }>
  >;
  return pkgVulnPaths.map((vulnPath) =>
    vulnPath
      .map((vulnPathPkg) => `${vulnPathPkg.name}@${vulnPathPkg.version}`)
      .reverse()
      .slice(1),
  );
};

import { posix } from 'path';
import { Component } from './component';
import { Project } from './project';
import { Task } from './tasks';

/**
 * Options for `Version`.
 */
export interface VersionOptions {
  /**
   * A name of a .json file to set the `version` field in after a bump.
   *
   * @example "package.json"
   */
  readonly versionInputFile: string;

  /**
   * The name of the directory into which `changelog.md` and `version.txt` files
   * are emitted.
   */
  readonly artifactsDirectory: string;
}

export class Version extends Component {
  public static readonly STANDARD_VERSION = 'standard-version@^9';

  public readonly bumpTask: Task;
  public readonly unbumpTask: Task;

  /**
   * The name of the changelog file (under `artifactsDirectory`).
   */
  public readonly changelogFileName: string;

  /**
   * The name of the file that contains the version (under `artifactsDirectory`).
   */
  public readonly versionFileName: string;

  constructor(project: Project, options: VersionOptions) {
    super(project);

    this.changelogFileName = 'changelog.md';
    this.versionFileName = 'version.txt';

    const versionInputFile = options.versionInputFile;

    // this command determines if there were any changes since the last release
    // (the top-most commit is not a bump). it is used as a condition for both
    // the `bump` and the `release` tasks.
    const changesSinceLastRelease = '! git log --oneline -1 | grep -q "chore(release):"';

    const changelogFile = posix.join(options.artifactsDirectory, this.changelogFileName);
    const bumpFile = posix.join(options.artifactsDirectory, this.versionFileName);

    const env = {
      OUTFILE: versionInputFile,
      CHANGELOG: changelogFile,
      BUMPFILE: bumpFile,
    };

    this.bumpTask = project.addTask('bump', {
      description: 'Bumps version based on latest git tag and generates a changelog entry',
      condition: changesSinceLastRelease,
      env: env,
    });

    this.bumpTask.builtin('release/bump-version');

    this.unbumpTask = project.addTask('unbump', {
      description: 'Restores version to 0.0.0',
      env: env,
    });

    this.unbumpTask.builtin('release/reset-version');

    project.addGitIgnore(`/${changelogFile}`);
    project.addGitIgnore(`/${bumpFile}`);
    project.addPackageIgnore(`/${changelogFile}`);
    project.addPackageIgnore(`/${bumpFile}`);
  }
}

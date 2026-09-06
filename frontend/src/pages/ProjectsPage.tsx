import {
  MoreVertical,
  Plus,
  RefreshCw,
} from "lucide-react";

import { App, Button, Dropdown, Table } from "antd";
import type { SortOrder } from "antd/es/table/interface";

import { useEffect, useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import {
  createProject,
  deleteProject,
  exportProjectReport,
  getProjects,
  updateProject,
} from "../api/projectsApi";

import { DeleteProjectModal } from "../components/DeleteProjectModal";
import { LoadingState } from "../components/LoadingState";
import { ProjectModal } from "../components/ProjectModal";

import type {
  Project,
  ProjectCreateRequest,
  ProjectSummary,
} from "../types/project";
import {
  formatLocalDateTime,
  formatRelativeTime,
} from "../utils/date";
import { getApiErrorMessage } from "../utils/apiError";

function getTotalVulnerabilities(
  project: ProjectSummary,
): number {
  return (
    project.critical +
    project.high +
    project.medium +
    project.low +
    project.info
  );
}

function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [isProjectModalOpen, setProjectModalOpen] =
    useState(false);

  const [editingProject, setEditingProject] =
    useState<Project | null>(null);

  const [deletingProject, setDeletingProject] =
    useState<Project | null>(null);

  const [exportingProject, setExportingProject] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [scannerFilter, setScannerFilter] =
    useState("");

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const saveMutation = useMutation({
    mutationFn: async (
      request: ProjectCreateRequest,
    ) => {
      if (editingProject) {
        return updateProject(
          editingProject.id,
          request,
        );
      }

      return createProject(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      setProjectModalOpen(false);
      setEditingProject(null);
      setActionError("");
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      setDeletingProject(null);
      setActionError("");
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  function openCreateModal(): void {
    setEditingProject(null);
    setActionError("");
    setProjectModalOpen(true);
  }

  function closeProjectModal(): void {
    if (saveMutation.isPending) {
      return;
    }

    setProjectModalOpen(false);
    setEditingProject(null);
    setActionError("");
  }

  async function handleSaveProject(
    request: ProjectCreateRequest,
  ): Promise<void> {
    setActionError("");
    await saveMutation.mutateAsync(request);
  }

  async function handleDeleteProject(): Promise<void> {
    if (!deletingProject) {
      return;
    }

    setActionError("");

    await deleteMutation.mutateAsync(
      deletingProject.id,
    );
  }

  async function downloadProjectReport(
    project: ProjectSummary,
    format: "pdf" | "csv",
  ): Promise<void> {
    const exportKey = `${project.id}:${format}`;
    setExportingProject(exportKey);

    try {
      const blob = await exportProjectReport(
        project.id,
        format,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replaceAll(" ", "_")}_security_report.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      message.success(
        `${format.toUpperCase()} report downloaded.`,
      );
    } catch {
      message.error(
        "Unable to generate the project report.",
      );
    } finally {
      setExportingProject(null);
    }
  }

  const projects = projectsQuery.data ?? [];
  const normalizedSearchQuery = searchQuery
    .trim()
    .toLowerCase();
  const scannerOptions = Array.from(
    new Set(projects.flatMap((project) => project.scanners ?? [])),
  ).sort();
  const filteredCount = projects.filter((project) => {
    const matchesName = project.name
      .toLowerCase()
      .includes(normalizedSearchQuery);
    const matchesScanner =
      !scannerFilter || project.scanners?.includes(scannerFilter);
    return matchesName && Boolean(matchesScanner);
  }).length;

  const columns = [
    {
      title: "Project name",
      dataIndex: "name",
      key: "name",
      sorter: (a: ProjectSummary, b: ProjectSummary) =>
        a.name.localeCompare(b.name),
      filteredValue: searchQuery ? [searchQuery] : null,
      filterDropdown: () => (
        <div className="table-filter-menu">
          <input
            type="search"
            value={searchQuery}
            placeholder="Search projects"
            autoFocus
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      ),
      onFilter: (value: unknown, record: ProjectSummary) =>
        record.name.toLowerCase().includes(String(value).toLowerCase()),
      render: (name: string, project: ProjectSummary) => (
        <button
          type="button"
          className="project-name-cell"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          <strong>{name}</strong>
        </button>
      ),
    },
    {
      title: "Last scan",
      dataIndex: "last_scan",
      key: "last_scan",
      sorter: (
        a: ProjectSummary,
        b: ProjectSummary,
        sortOrder?: SortOrder,
      ) => {
        if (!a.last_scan && !b.last_scan) return 0;
        if (!a.last_scan) return sortOrder === "descend" ? -1 : 1;
        if (!b.last_scan) return sortOrder === "descend" ? 1 : -1;
        return (
          new Date(a.last_scan).getTime() -
          new Date(b.last_scan).getTime()
        );
      },
      render: (_: unknown, project: ProjectSummary) => (
        <span
          className="project-cell muted"
          title={formatLocalDateTime(project.last_scan)}
        >
          {formatRelativeTime(project.last_scan, now)}
        </span>
      ),
    },
    {
      title: "Scanners",
      dataIndex: "scanners",
      key: "scanners",
      filteredValue: scannerFilter ? [scannerFilter] : null,
      filterMultiple: false,
      filters: scannerOptions.map((scanner) => ({
        text: scanner,
        value: scanner,
      })),
      onFilter: (value: unknown, record: ProjectSummary) =>
        Boolean(record.scanners?.includes(String(value))),
      render: (scanners: string[] | null) => (
        <div className="scanner-list">
          {scanners?.length ? (
            scanners.map((scanner) => (
              <span className="scanner-badge" key={scanner}>
                {scanner}
              </span>
            ))
          ) : (
            <span className="scanner-badge">No scanners</span>
          )}
        </div>
      ),
    },
    {
      title: "Total vulnerabilities",
      key: "vulnerabilities",
      sorter: (a: ProjectSummary, b: ProjectSummary) =>
        getTotalVulnerabilities(a) - getTotalVulnerabilities(b),
      render: (_: unknown, project: ProjectSummary) => (
        <div
          className="vulnerability-summary"
          tabIndex={0}
          aria-label={`Total vulnerabilities ${getTotalVulnerabilities(project)}. Critical ${project.critical}, high ${project.high}, medium ${project.medium}, low ${project.low}, info ${project.info}.`}
        >
          <span className="vulnerability-bar" aria-hidden="true">
            <i className="critical" />
            <i className="high" />
            <i className="medium" />
            <i className="low" />
            <i className="info" />
          </span>
          <strong>{getTotalVulnerabilities(project)}</strong>
          <span className="vulnerability-tooltip" role="tooltip">
            C:{project.critical} H:{project.high}{" "}
            M:{project.medium} L:{project.low} I:{project.info}
          </span>
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      render: (_: unknown, project: ProjectSummary) => (
        <div className="project-menu-wrapper">
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "settings",
                  label: "Project settings",
                },
                { type: "divider" },
                {
                  key: "pdf",
                  label: "Export PDF",
                  disabled: exportingProject !== null,
                },
                {
                  key: "csv",
                  label: "Export CSV",
                  disabled: exportingProject !== null,
                },
                { type: "divider" },
                {
                  key: "delete",
                  label: "Delete project",
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === "settings") {
                  navigate(
                    `/projects/${project.id}/settings`,
                  );
                } else if (
                  key === "pdf" ||
                  key === "csv"
                ) {
                  void downloadProjectReport(
                    project,
                    key,
                  );
                } else if (key === "delete") {
                  setActionError("");
                  setDeletingProject(project);
                }
              },
            }}
          >
            <Button
              type="text"
              size="small"
              className="project-actions-button"
              aria-label={`Actions for ${project.name}`}
              loading={
                exportingProject?.startsWith(
                  `${project.id}:`,
                ) ?? false
              }
              icon={<MoreVertical size={18} />}
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container projects-page">
      <div className="page-heading">
        <div>
          <h1>Projects</h1>
        </div>

        <button
          type="button"
          className="primary-button small"
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Create project
        </button>
      </div>

      {actionError && (
        <div className="alert-error page-alert">
          {actionError}
        </div>
      )}

      {projectsQuery.isLoading && (
        <LoadingState><p>Loading projects...</p></LoadingState>
      )}

      {projectsQuery.isError && (
        <div className="empty-state">
          <h2>Unable to load projects</h2>

          <p>
            {getErrorMessage(projectsQuery.error)}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              projectsQuery.refetch()
            }
          >
            <RefreshCw size={17} />
            Try again
          </button>
        </div>
      )}

      {!projectsQuery.isLoading &&
        !projectsQuery.isError &&
        projects.length === 0 && (
          <div className="empty-state">
            <h2>No projects yet</h2>

            <p>
              Create your first project to begin
              importing SARIF security reports.
            </p>

            <button
              type="button"
              className="primary-button small"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Create first project
            </button>
          </div>
        )}

      {!projectsQuery.isLoading &&
        !projectsQuery.isError &&
        projects.length > 0 && (
          <>
            <div className="projects-summary">
              <span>
                {filteredCount}{" "}
                {filteredCount === 1
                  ? "project"
                  : "projects"}
              </span>
            </div>

            <Table<ProjectSummary>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={projects}
              pagination={false}
              sortDirections={["ascend", "descend"]}
              locale={{ emptyText: "No projects match the selected filters." }}
              onChange={(_pagination, filters) => {
                const nextScanner = filters.scanners;
                setScannerFilter(
                  Array.isArray(nextScanner) && nextScanner.length
                    ? String(nextScanner[0])
                    : "",
                );
              }}
            />
          </>
        )}

      <ProjectModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        isSubmitting={saveMutation.isPending}
        onClose={closeProjectModal}
        onSubmit={handleSaveProject}
      />

      <DeleteProjectModal
        project={deletingProject}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeletingProject(null);
            setActionError("");
          }
        }}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

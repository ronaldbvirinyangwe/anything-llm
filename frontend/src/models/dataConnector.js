import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import showToast from "@/utils/toast";

async function collect(path, payload) {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((res) => {
      if (!res.success) throw new Error(res.reason);
      return { data: res.data, error: null };
    })
    .catch((e) => {
      console.error(e);
      return { data: null, error: e.message };
    });
}

async function branches(path, payload) {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: baseHeaders(),
    cache: "force-cache",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((res) => {
      if (!res.success) throw new Error(res.reason);
      return { branches: res.data?.branches || [], error: null };
    })
    .catch((e) => {
      console.error(e);
      showToast(e.message, "error");
      return { branches: [], error: e.message };
    });
}

const DataConnector = {
  github: {
    branches: ({ repo, accessToken }) =>
      branches("/ext/github/branches", { repo, accessToken }),
    collect: ({ repo, accessToken, branch, ignorePaths = [] }) =>
      collect("/ext/github/repo", { repo, accessToken, branch, ignorePaths }),
  },
  gitlab: {
    branches: ({ repo, accessToken }) =>
      branches("/ext/gitlab/branches", { repo, accessToken }),
    collect: ({
      repo,
      accessToken,
      branch,
      ignorePaths = [],
      fetchIssues = false,
      fetchWikis = false,
    }) =>
      collect("/ext/gitlab/repo", {
        repo,
        accessToken,
        branch,
        ignorePaths,
        fetchIssues,
        fetchWikis,
      }),
  },
  youtube: {
    transcribe: ({ url }) => collect("/ext/youtube/transcript", { url }),
  },
  websiteDepth: {
    scrape: ({ url, depth, maxLinks }) =>
      collect("/ext/website-depth", { url, depth, maxLinks }),
  },
  confluence: {
    collect: (payload) => collect("/ext/confluence", payload),
  },
  drupalwiki: {
    collect: (payload) => collect("/ext/drupalwiki", payload),
  },
  obsidian: {
    collect: ({ files }) => collect("/ext/obsidian/vault", { files }),
  },
};

export default DataConnector;

const { Workspace } = require("../../models/workspace");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { WorkspaceUser } = require("../../models/workspaceUsers");
const { userFromSession, multiUserMode } = require("../http");
const { ROLES } = require("./multiUserProtected");

async function workspaceForUser(user, slug, response) {
  const workspace = await Workspace.get({ slug });
  if (!workspace || !multiUserMode(response)) return workspace;
  if ([ROLES.admin, ROLES.manager].includes(user?.role)) return workspace;
  const membership = await WorkspaceUser.get({
    workspace_id: workspace.id,
    user_id: user?.id,
  });
  return membership ? workspace : null;
}

// Will pre-validate and set the workspace for a request if the slug is provided in the URL path.
async function validWorkspaceSlug(request, response, next) {
  const { slug } = request.params;
  const user = await userFromSession(request, response);
  const workspace = await workspaceForUser(user, slug, response);

  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

  response.locals.workspace = workspace;
  next();
}

// Will pre-validate and set the workspace AND a thread for a request if the slugs are provided in the URL path.
async function validWorkspaceAndThreadSlug(request, response, next) {
  const { slug, threadSlug } = request.params;
  const user = await userFromSession(request, response);
  const workspace = await workspaceForUser(user, slug, response);

  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

  const thread = await WorkspaceThread.get({
    slug: threadSlug,
    workspace_id: workspace.id,
    user_id: user?.id || null,
  });
  if (!thread) {
    response.status(404).send("Workspace thread does not exist.");
    return;
  }

  response.locals.workspace = workspace;
  response.locals.thread = thread;
  next();
}

module.exports = {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
};

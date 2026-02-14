// Local-only auth - always returns the default local user
export async function verifyUserAuthenticated() {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "local@local.com",
      username: "local-user",
    },
  };
}

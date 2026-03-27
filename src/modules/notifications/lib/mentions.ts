import { UserStatus, type Prisma } from "@/generated/prisma/client";

const mentionPattern = /(^|[\s(>])@([A-Za-z0-9_]{3,20})\b/g;

export function extractMentionUsernames(text: string) {
  const usernames = new Map<string, string>();

  for (const match of text.matchAll(mentionPattern)) {
    const username = match[2]?.trim();

    if (!username) {
      continue;
    }

    usernames.set(username.toLowerCase(), username);
  }

  return Array.from(usernames.values());
}

export function linkifyMentionsInEscapedText(text: string) {
  return text.replace(
    mentionPattern,
    (_, prefix: string, username: string) =>
      `${prefix}<a class="mention-link" href="/users/${username}">@${username}</a>`
  );
}

export async function findMentionedUsers(
  client: Prisma.TransactionClient,
  usernames: string[]
) {
  const normalizedUsernames = Array.from(
    new Map(
      usernames
        .map((username) => username.trim())
        .filter(Boolean)
        .map((username) => [username.toLowerCase(), username])
    ).values()
  );

  if (normalizedUsernames.length === 0) {
    return [];
  }

  return client.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      OR: normalizedUsernames.map((username) => ({
        username: {
          equals: username,
          mode: "insensitive"
        }
      }))
    },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  });
}

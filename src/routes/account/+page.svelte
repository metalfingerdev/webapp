<script lang="ts">
  import { resolve } from "$app/paths";
  import { refreshAll } from "$app/navigation";
  import { Avatar } from "bits-ui";
  import { useQuery } from "convex-svelte";
  import UserRoundIcon from "@lucide/svelte/icons/user-round";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

  import { AUTH_CONSTANTS } from "#convex/auth.constants.js";
  import { getAuthContext } from "#lib/auth/context.svelte.js";
  import { useRequireSignIn } from "#lib/auth/requireSignIn.svelte.js";

  const auth = useRequireSignIn();
  const { api, authClient } = getAuthContext();

  // Gating is UX only: every Convex function behind this page checks who is signed in
  const user = useQuery(api.users.queries.getActiveUser, () =>
    auth.isAuthenticated ? {} : "skip",
  );
  const me = $derived(user.data);

  const initials = $derived(
    (me?.name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "?",
  );
  // A phone-only sign-up has its number as its name and only a placeholder email
  const phoneLine = $derived(me?.phoneNumber ?? "");
  const emailLine = $derived(
    me?.email && !me.email.endsWith(".invalid") ? me.email : "",
  );

  const signOut = async () => {
    const result = await authClient.signOut();
    if (result.data?.success) refreshAll();
  };
</script>

<svelte:head>
  <title>
    {AUTH_CONSTANTS.brandName ? `Account | ${AUTH_CONSTANTS.brandName}` : "Account"}
  </title>
</svelte:head>

<div class="page">
  <h1 class="title">Account</h1>

  <!-- The same card as a loaded one, drawn with placeholders -->
  <section class="who" aria-busy={me === undefined} aria-label="Account">
    {#if me === undefined}
      <span class="photo bone" aria-hidden="true"></span>
      <span class="names" aria-hidden="true">
        <b class="bone">Your name</b>
        <span class="small bone">+91 98765 43210</span>
      </span>
    {:else if me}
      <Avatar.Root class="photo">
        <Avatar.Image src={me.image} alt="" class="fit" />
        <Avatar.Fallback class="initials">{initials}</Avatar.Fallback>
      </Avatar.Root>
      <span class="names">
        <b>{me.name}</b>
        {#if phoneLine}<span class="small">{phoneLine}</span>{/if}
        {#if emailLine}<span class="small">{emailLine}</span>{/if}
      </span>
    {/if}
  </section>

  <nav class="menu" aria-label="Account">
    <a class="item" href={resolve("/account/profile")}>
      <span class="icon"><UserRoundIcon size={20} aria-hidden="true" /></span>
      <span class="text">
        <b>Profile</b>
        <span class="small">Name, photo, email, phone, sign-in methods</span>
      </span>
      <ChevronRightIcon class="chevron" size={20} aria-hidden="true" />
    </a>
    <button type="button" class="item" onclick={signOut}>
      <span class="icon"><LogOutIcon size={20} aria-hidden="true" /></span>
      <span class="text"><b>Sign out</b></span>
    </button>
  </nav>
</div>

<style lang="postcss">
  @reference 'src/app.css';

  /* A readable width on a wide screen */
  div.page {
    @apply mx-auto flex w-full max-w-xl flex-col gap-5 p-4;

    h1.title {
      @apply type-display text-5xl;
    }

    section.who {
      @apply flex items-center gap-4 rounded-[1.75rem] p-5 raised;

      :global(div.photo),
      span.photo {
        @apply relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full font-display text-xl font-extrabold text-on-secondary raised-secondary;
      }
      :global(img.fit) {
        @apply size-full object-cover;
      }
      :global(span.initials) {
        @apply grid size-full place-items-center;
      }
      span.names {
        @apply flex min-w-0 flex-1 flex-col;

        b {
          @apply truncate font-display text-lg;
        }
      }
    }

    .small {
      @apply truncate text-sm text-text-muted;
    }

    nav.menu {
      @apply flex flex-col gap-3;

      .item {
        @apply flex min-h-16 w-full items-center gap-4 rounded-3xl px-4 py-3 text-left raised press;

        span.icon {
          @apply grid size-11 shrink-0 place-items-center rounded-full sunken;
        }
        span.text {
          @apply flex min-w-0 flex-1 flex-col;
        }
        :global(svg.chevron) {
          @apply shrink-0 text-text-muted;
        }
      }
    }
  }
</style>

<script lang="ts">
  import { resolve } from "$app/paths";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";

  import { AUTH_CONSTANTS } from "#convex/auth.constants.js";
  import { getAuthContext } from "#lib/auth/context.svelte.js";
  import { useRequireSignIn } from "#lib/auth/requireSignIn.svelte.js";
  import ProfileInfo from "#lib/users/ui/ProfileInfo.svelte";
  import Emails from "#lib/users/ui/Emails.svelte";
  import PhoneNumber from "#lib/users/ui/PhoneNumber.svelte";
  import Accounts from "#lib/users/ui/Accounts.svelte";
  import ApiKeys from "#lib/users/ui/ApiKeys.svelte";
  import DeleteUser from "#lib/users/ui/DeleteUser.svelte";

  useRequireSignIn();
  const { authConstants } = getAuthContext();
</script>

<svelte:head>
  <title>
    {AUTH_CONSTANTS.brandName ? `Profile | ${AUTH_CONSTANTS.brandName}` : "Profile"}
  </title>
</svelte:head>

<div class="page">
  <a class="back" href={resolve("/account")}>
    <ChevronLeftIcon size={20} aria-hidden="true" />
    Account
  </a>
  <h1 class="title">Profile</h1>

  <div class="fields">
    <ProfileInfo />
    <Emails />
    {#if authConstants.providers.phoneOTP}
      <PhoneNumber />
    {/if}
  </div>

  <Accounts />
  {#if authConstants.apiKeys}
    <ApiKeys />
  {/if}

  <section class="danger">
    <h2 class="section">Danger zone</h2>
    <DeleteUser />
  </section>
</div>

<style lang="postcss">
  @reference 'src/app.css';

  /* A readable width on a wide screen */
  div.page {
    @apply mx-auto flex w-full max-w-xl flex-col gap-5 p-4;

    a.back {
      @apply -ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 font-semibold text-text-muted;
    }
    h1.title {
      @apply type-display text-5xl;
    }
    div.fields {
      @apply flex flex-col gap-4;
    }
    section.danger {
      @apply flex flex-col items-start gap-3 rounded-[1.75rem] p-5 sunken;

      h2.section {
        @apply type-kicker text-danger;
      }
    }
  }
</style>

<script lang="ts">
  import { Select } from "bits-ui";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  type Option = { value: string; label: string };

  let {
    value = $bindable(),
    options,
    label,
  }: { value: string; options: Option[]; label: string } = $props();

  const selected = $derived(options.find((option) => option.value === value));
</script>

<Select.Root type="single" bind:value items={options}>
  <Select.Trigger class="ui-select-trigger" aria-label={label}>
    <span>{selected?.label ?? label}</span>
    <ChevronDownIcon size={16} aria-hidden="true" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content class="ui-select-menu" sideOffset={6} align="start">
      <Select.Viewport>
        {#each options as option (option.value)}
          <Select.Item value={option.value} label={option.label} class="ui-select-option">
            {#snippet children({ selected })}
              <span>{option.label}</span>
              {#if selected}<CheckIcon size={16} aria-hidden="true" />{/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style lang="postcss">
  @reference 'src/app.css';

  /* Bits renders these elements itself, so they are styled as global */
  :global {
    button.ui-select-trigger {
      @apply inline-flex min-h-11 items-center justify-between gap-2 rounded-full px-4 font-bold raised press;
    }
    div.ui-select-menu {
      @apply z-30 min-w-44 rounded-2xl p-1.5 floating;
    }
    div.ui-select-option {
      @apply flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 font-semibold;

      &[data-highlighted] {
        @apply sunken;
      }
      &[data-selected] {
        @apply text-primary;
      }
    }
  }
</style>

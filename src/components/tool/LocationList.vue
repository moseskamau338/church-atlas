<script setup>
import { ref, nextTick } from 'vue'
import { useDistanceSession } from '../../composables/useDistanceSession.js'

const { state, removeLocation, renameLocation, clearAll } = useDistanceSession()

const editingId = ref(null)
const draft = ref('')
const inputRef = ref(null)

async function startEdit(loc) {
  editingId.value = loc.id
  draft.value = loc.name
  await nextTick()
  inputRef.value?.[0]?.focus()
  inputRef.value?.[0]?.select()
}
function commitEdit(id) {
  const name = draft.value.trim()
  if (name) renameLocation(id, name)
  editingId.value = null
}
</script>

<template>
  <div class="loc-list">
    <div class="loc-list__head">
      <span class="loc-list__count"
        >{{ state.locations.length }} location{{ state.locations.length === 1 ? '' : 's' }}</span
      >
      <button v-if="state.locations.length" type="button" class="loc-list__clear" @click="clearAll">
        Clear all
      </button>
    </div>

    <p v-if="!state.locations.length" class="loc-list__empty">
      No locations yet. Search above or click the map to drop a pin.
    </p>

    <ul v-else class="loc-list__items">
      <li v-for="(loc, i) in state.locations" :key="loc.id" class="loc-item">
        <span class="loc-item__index" :style="{ background: loc.color }">{{ i + 1 }}</span>

        <div class="loc-item__body">
          <input
            v-if="editingId === loc.id"
            ref="inputRef"
            v-model="draft"
            class="loc-item__edit"
            @blur="commitEdit(loc.id)"
            @keydown.enter.prevent="commitEdit(loc.id)"
            @keydown.esc="editingId = null"
          />
          <button
            v-else
            type="button"
            class="loc-item__name"
            title="Click to rename"
            @click="startEdit(loc)"
          >
            {{ loc.name }}
          </button>
          <span class="loc-item__meta">{{ loc.lat.toFixed(4) }}, {{ loc.lng.toFixed(4) }}</span>
        </div>

        <label
          v-if="state.connectionMode === 'origin'"
          class="loc-item__origin"
          :title="`Use ${loc.name} as origin`"
        >
          <input
            type="radio"
            name="origin"
            :value="loc.id"
            :checked="state.originId === loc.id"
            @change="state.originId = loc.id"
          />
          <span>origin</span>
        </label>

        <button
          type="button"
          class="loc-item__remove"
          :title="`Remove ${loc.name}`"
          @click="removeLocation(loc.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.loc-list {
  display: flex;
  flex-direction: column;
}
.loc-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
}
.loc-list__count {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(26, 23, 20, 0.6);
}
.loc-list__clear {
  border: 0;
  background: transparent;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--burgundy);
  cursor: pointer;
}
.loc-list__clear:hover {
  text-decoration: underline;
}
.loc-list__empty {
  font-family: var(--serif);
  font-style: italic;
  font-size: 14px;
  color: rgba(26, 23, 20, 0.55);
  margin: 4px 2px;
}
.loc-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.loc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--rule-vsoft);
}
.loc-item__index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
}
.loc-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.loc-item__name {
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0;
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loc-item__name:hover {
  text-decoration: underline dotted;
}
.loc-item__edit {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 600;
  border: 1px solid var(--ink);
  background: var(--paper);
  padding: 1px 4px;
  outline: none;
}
.loc-item__meta {
  font-family: var(--mono);
  font-size: 10px;
  color: rgba(26, 23, 20, 0.5);
}
.loc-item__origin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(26, 23, 20, 0.6);
  cursor: pointer;
}
.loc-item__remove {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: rgba(26, 23, 20, 0.4);
  font-size: 13px;
  cursor: pointer;
  padding: 2px 4px;
}
.loc-item__remove:hover {
  color: var(--burgundy);
}
</style>

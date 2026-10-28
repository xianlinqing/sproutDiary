<script setup lang="ts" generic="T extends string | number">
import AppIcon from './AppIcon.vue';
const props = withDefaults(
  defineProps<{
    modelValue: T;
    placeholder?: string;
    type?: 'text' | 'number';
    maxlength?: number;
  }>(),
  { type: 'text', maxlength: -1 },
);
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
function update(value: string | number) {
  emit(
    'update:modelValue',
    (typeof props.modelValue === 'number' ? Number(value) : String(value)) as T,
  );
}
</script>
<template>
  <wd-input
    :model-value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :maxlength="maxlength"
    custom-class="sprout-input"
    @update:model-value="update"
  >
    <template #suffix>
      <button
        v-if="String(modelValue) !== ''"
        class="input-clear"
        aria-label="清空输入内容"
        @click.stop="update('')"
      >
        <AppIcon name="close" tone="muted" :size="28" />
      </button>
    </template>
  </wd-input>
</template>
<style scoped>
.input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #edf0e5;
  border: 0;
  padding: 0;
  margin: 0;
}
</style>

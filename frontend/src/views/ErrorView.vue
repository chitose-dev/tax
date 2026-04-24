<template>
  <div class="error-container">
    <div class="error-card">
      <h1 class="error-title">ご利用のURLが正しくありません</h1>
      <p class="error-message">管理者より配布されたURLをご確認の上、再度アクセスしてください。</p>
    </div>
  </div>
</template>

<style scoped>
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-gray-50, #f9fafb);
}
.error-card {
  background: var(--color-white, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 90%;
  max-width: 480px;
  text-align: center;
}
.error-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-gray-900, #111827);
  margin-bottom: 12px;
}
.error-message {
  font-size: 14px;
  color: var(--color-gray-600, #4b5563);
  line-height: 1.6;
}
</style>

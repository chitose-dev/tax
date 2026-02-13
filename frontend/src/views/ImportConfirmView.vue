<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div>
    <div class="page-header">
      <h1>インポート完了</h1>
    </div>
    <div class="card">
      <div class="card-body" style="text-align:center;padding:48px">
        <div style="font-size:48px;margin-bottom:16px">&#10003;</div>
        <h2 style="font-size:20px;margin-bottom:8px">データの取り込みが完了しました</h2>
        <p class="text-gray">集計画面で結果を確認してください</p>
        <div style="margin-top:24px;display:flex;gap:8px;justify-content:center">
          <button class="btn-secondary" @click="router.push('/import')">続けてインポート</button>
          <button class="btn-primary" @click="router.push('/summary')">集計画面へ</button>
        </div>
      </div>
    </div>
  </div>
</template>

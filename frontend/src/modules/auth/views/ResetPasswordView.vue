<template>
  <div class="auth-page">
    <div class="auth-card">

      <div class="auth-logo">✦</div>

      <!-- Token inválido -->
      <div class="invalid-box" v-if="tokenInvalid">
        <div class="invalid-icon">⚠️</div>
        <h1 class="auth-title">Link expirado</h1>
        <p class="auth-desc">Este link de redefinição é inválido ou expirou.</p>
        <RouterLink to="/esqueci-senha" class="btn-submit" style="text-decoration:none;text-align:center;">
          Solicitar novo link
        </RouterLink>
      </div>

      <!-- Sucesso -->
      <div class="success-box" v-else-if="done">
        <div class="success-icon">✅</div>
        <h1 class="auth-title">Senha redefinida!</h1>
        <p class="auth-desc">Sua senha foi alterada com sucesso.</p>
        <RouterLink to="/login" class="btn-submit" style="text-decoration:none;text-align:center;">
          Fazer login
        </RouterLink>
      </div>

      <!-- Formulário -->
      <template v-else-if="!validating">
        <h1 class="auth-title">Nova senha</h1>
        <p class="auth-desc">Digite sua nova senha abaixo.</p>

        <form @submit.prevent="submit" class="auth-form">
          <div class="field">
            <label class="field-label">Nova senha</label>
            <input
              v-model="password"
              type="password"
              class="field-input"
              :class="{ error: errors.password }"
              placeholder="Mínimo 6 caracteres"
              required
            />
            <span class="field-error" v-if="errors.password">{{ errors.password }}</span>
          </div>

          <div class="field">
            <label class="field-label">Confirmar senha</label>
            <input
              v-model="confirm"
              type="password"
              class="field-input"
              :class="{ error: errors.confirm }"
              placeholder="Repita a senha"
              required
            />
            <span class="field-error" v-if="errors.confirm">{{ errors.confirm }}</span>
          </div>

          <!-- Força da senha -->
          <div class="password-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="strengthClass"
                :style="{ width: strengthPercent + '%' }"
              ></div>
            </div>
            <span class="strength-label">{{ strengthLabel }}</span>
          </div>

          <div class="server-error" v-if="serverError">{{ serverError }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? 'Salvando...' : 'Redefinir senha' }}
          </button>
        </form>
      </template>

      <!-- Validando token -->
      <div class="validating" v-else>
        <div class="btn-spinner" style="margin:2rem auto;border-color:rgba(28,26,23,0.2);border-top-color:#B8965A;width:32px;height:32px;"></div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/shared/utils/api'

const route  = useRoute()
const router = useRouter()

const token        = ref('')
const password     = ref('')
const confirm      = ref('')
const loading      = ref(false)
const validating   = ref(true)
const tokenInvalid = ref(false)
const done         = ref(false)
const serverError  = ref('')
const errors       = reactive({ password: '', confirm: '' })

// Força da senha
const strengthPercent = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 6)  score += 25
  if (p.length >= 10) score += 25
  if (/[A-Z]/.test(p)) score += 25
  if (/[0-9!@#$%]/.test(p)) score += 25
  return score
})
const strengthClass = computed(() => {
  if (strengthPercent.value <= 25) return 'weak'
  if (strengthPercent.value <= 50) return 'fair'
  if (strengthPercent.value <= 75) return 'good'
  return 'strong'
})
const strengthLabel = computed(() => {
  if (!password.value) return ''
  if (strengthPercent.value <= 25) return 'Fraca'
  if (strengthPercent.value <= 50) return 'Regular'
  if (strengthPercent.value <= 75) return 'Boa'
  return 'Forte'
})

onMounted(async () => {
  token.value = route.query.token || ''
  if (!token.value) { tokenInvalid.value = true; validating.value = false; return }

  try {
    await api.get(`/auth/validate-reset-token/${token.value}`)
    validating.value = false
  } catch {
    tokenInvalid.value = true
    validating.value   = false
  }
})

async function submit() {
  errors.password = ''
  errors.confirm  = ''
  serverError.value = ''

  if (password.value.length < 6) { errors.password = 'Mínimo 6 caracteres'; return }
  if (password.value !== confirm.value) { errors.confirm = 'As senhas não coincidem'; return }

  loading.value = true
  try {
    await api.post('/auth/reset-password', {
      token:    token.value,
      password: password.value,
    })
    done.value = true
  } catch (e) {
    serverError.value = e.response?.data?.message || 'Erro ao redefinir senha.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

.auth-page {
  min-height: 100vh; background: #F9F6F0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; padding: 1rem;
}
.auth-card {
  background: #FDFBF8; border: 1px solid rgba(28,26,23,0.08);
  border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 420px;
  box-shadow: 0 4px 24px rgba(28,26,23,0.06);
}
.auth-logo  { text-align: center; font-size: 2rem; color: #B8965A; margin-bottom: 1.25rem; }
.auth-title { font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 600; color: #1C1A17; text-align: center; margin-bottom: 0.5rem; }
.auth-desc  { text-align: center; color: #4A4540; font-size: 0.88rem; line-height: 1.6; margin-bottom: 2rem; }
.auth-form  { display: flex; flex-direction: column; gap: 1.25rem; }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field-label { font-size: 0.78rem; font-weight: 600; color: #1C1A17; }
.field-input {
  padding: 0.75rem 1rem; border: 1px solid rgba(28,26,23,0.15);
  border-radius: 8px; background: #F9F6F0; font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem; color: #1C1A17; outline: none; transition: border-color 0.2s;
}
.field-input:focus { border-color: #B8965A; }
.field-input.error { border-color: #E05555; }
.field-error { font-size: 0.72rem; color: #E05555; }

/* Força da senha */
.password-strength { display: flex; align-items: center; gap: 0.75rem; }
.strength-bar  { flex: 1; height: 4px; background: rgba(28,26,23,0.08); border-radius: 2px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
.strength-fill.weak   { background: #E05555; }
.strength-fill.fair   { background: #FF963C; }
.strength-fill.good   { background: #B8965A; }
.strength-fill.strong { background: #64C882; }
.strength-label { font-size: 0.72rem; color: #9C9590; min-width: 40px; }

.server-error {
  padding: 0.75rem 1rem; background: rgba(224,85,85,0.08);
  border: 1px solid rgba(224,85,85,0.2); border-radius: 8px;
  font-size: 0.82rem; color: #E05555; text-align: center;
}
.btn-submit {
  padding: 0.85rem; background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 8px; font-size: 0.95rem;
  font-family: 'DM Sans', sans-serif; font-weight: 500;
  cursor: pointer; transition: background 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.btn-submit:hover:not(:disabled) { background: #B8965A; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.success-box, .invalid-box {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; text-align: center;
}
.success-icon, .invalid-icon { font-size: 3rem; }
.validating { display: flex; justify-content: center; }
</style>

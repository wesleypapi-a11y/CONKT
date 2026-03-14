import { arcoColors } from '../styles/colors';

export default function PlanosPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="mb-8">
            <img
              src="/azul_marinho_sem_fundo.png"
              alt="ARCO Logo"
              className="h-24 mx-auto mb-6"
            />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Nossos Planos
            </h1>
            <p className="text-xl text-gray-600">
              Em breve você terá acesso aos nossos planos personalizados
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: arcoColors.sidebar.main }}
            >
              Voltar para o Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

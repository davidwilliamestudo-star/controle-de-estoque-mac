import { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '../OnboardingContext';
import { Volume2, VolumeX, ChevronRight, ChevronLeft, CalendarDays, ClipboardList, Package, Syringe, FileText, User, Mail, Tag, AlertTriangle, PlayCircle, CheckCircle2 } from 'lucide-react';
import './OnboardingScreen.css';

import welcomeAudioUrl from '@/assets/onboarding/welcome-audio.mp3';

const TOTAL_FRAMES = 8;

export function OnboardingScreen() {
  const { showOnboarding, audioEnabled, finishOnboarding, toggleAudio } = useOnboarding();
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inicializar audio se necessário
    const initAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio(welcomeAudioUrl);
        audioRef.current.loop = false;
        audioRef.current.volume = 0.5;
        
        audioRef.current.addEventListener('error', () => {
          console.log('Audio file not found or could not be loaded. Continuing without audio.');
        });
      }
    };

    initAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (audioEnabled && !isClosing && currentFrame === 1) {
        audioRef.current.play().catch(e => console.log('Auto-play prevented by browser', e));
      } else if (!audioEnabled || isClosing) {
        audioRef.current.pause();
      }
    }
  }, [audioEnabled, currentFrame, isClosing]);

  const handleNext = () => {
    if (currentFrame < TOTAL_FRAMES) {
      setCurrentFrame(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentFrame > 1) {
      setCurrentFrame(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsClosing(true);
    setTimeout(() => {
      finishOnboarding(true);
    }, 600); // match animation duration
  };

  const handleFinish = () => {
    setIsClosing(true);
    setTimeout(() => {
      finishOnboarding(false);
    }, 600);
  };

  if (!showOnboarding && !isClosing) return null;

  return (
    <div className={`onboarding-overlay ${isClosing ? 'closing' : ''}`}>
      <header className="onboarding-header">
        <div className="onboarding-logo">
          VOLTQ <span>/</span> Dra. Ana Morong
        </div>
        <button onClick={toggleAudio} className="onboarding-audio-toggle" title={audioEnabled ? "Silenciar" : "Ativar áudio"}>
          {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </header>

      <div className="onboarding-body">
        {/* Frame 1 */}
        <div className={`onboarding-frame ${currentFrame === 1 ? 'active' : currentFrame > 1 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="visual-f1-card">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-900 flex items-center justify-center mb-2">
                <span className="text-2xl font-semibold">AM</span>
              </div>
              <div className="w-24 h-1 bg-gray-100 rounded-full"></div>
              <div className="w-48 h-2 bg-gray-100 rounded-full mt-2"></div>
              <div className="w-32 h-2 bg-gray-100 rounded-full mt-2"></div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Bem-vinda, Dra. Ana</h1>
          <p className="onboarding-frame-text">
            Este sistema foi preparado para tornar sua rotina clínica mais organizada, segura e eficiente.
          </p>
        </div>

        {/* Frame 2 */}
        <div className={`onboarding-frame ${currentFrame === 2 ? 'active' : currentFrame > 2 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f2-container">
              <div className="abstract-card f2-c1 delay-1 flex items-center gap-3"><CalendarDays className="text-[var(--color-green-deep)]"/> Agenda</div>
              <div className="abstract-card f2-c2 delay-2 flex items-center gap-3"><ClipboardList className="text-[var(--color-beige-camel)]"/> Prontuário</div>
              <div className="abstract-card f2-c3 delay-3 flex items-center gap-3"><Package className="text-gray-500"/> Estoque</div>
              <div className="abstract-card f2-c4 delay-4 flex items-center gap-3"><Syringe className="text-white"/> Aplicações</div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Um sistema feito para sua rotina clínica</h1>
          <p className="onboarding-frame-text">
            Cada módulo foi pensado para apoiar o controle, a rastreabilidade e a organização da operação.
          </p>
        </div>

        {/* Frame 3 */}
        <div className={`onboarding-frame ${currentFrame === 3 ? 'active' : currentFrame > 3 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f3-container">
              <div className="f3-row">
                <div className="f3-card delay-1">
                  <Package size={20} className="text-[var(--color-green-deep)] mb-2"/>
                  <div className="font-semibold text-sm">Disponível</div>
                  <div className="text-2xl font-bold mt-1">124</div>
                </div>
                <div className="f3-card delay-2">
                  <Tag size={20} className="text-[var(--color-beige-camel)] mb-2"/>
                  <div className="font-semibold text-sm">Lotes Ativos</div>
                  <div className="text-2xl font-bold mt-1">18</div>
                </div>
              </div>
              <div className="f3-line delay-3"></div>
              <div className="f3-row">
                <div className="f3-card delay-4 border-l-4 border-l-[var(--color-warning)]">
                  <AlertTriangle size={20} className="text-[var(--color-warning)] mb-2"/>
                  <div className="font-semibold text-sm">Próx. Vencimento</div>
                  <div className="text-2xl font-bold mt-1">3</div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Estoque clínico inteligente</h1>
          <p className="onboarding-frame-text">
            Acompanhe itens disponíveis, reservados, utilizados, lotes, vencimentos e alertas de falta com mais clareza.
          </p>
        </div>

        {/* Frame 4 */}
        <div className={`onboarding-frame ${currentFrame === 4 ? 'active' : currentFrame > 4 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f4-container">
              <div className="f4-step delay-1">
                <div className="f4-circle active">1</div>
                <div className="text-sm font-medium text-[var(--color-gray-900)]">Planejar</div>
              </div>
              <div className="f4-line delay-2"></div>
              <div className="f4-step delay-3">
                <div className="f4-circle">2</div>
                <div className="text-sm font-medium text-[var(--color-gray-500)]">Agendar</div>
              </div>
              <div className="f4-line delay-4"></div>
              <div className="f4-step delay-5">
                <div className="f4-circle">3</div>
                <div className="text-sm font-medium text-[var(--color-gray-500)]">Executar</div>
              </div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Aplicações com rastreabilidade</h1>
          <p className="onboarding-frame-text">
            Planeje, execute e finalize aplicações registrando protocolo, via, área, medicamentos, materiais e lotes utilizados.
          </p>
        </div>

        {/* Frame 5 */}
        <div className={`onboarding-frame ${currentFrame === 5 ? 'active' : currentFrame > 5 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f5-container">
              <div className="f5-bg"></div>
              <div className="f5-card f5-c1 delay-1">
                <User className="text-[var(--color-beige-camel)]" size={24}/>
                <div className="flex-1"><div className="h-2 bg-gray-200 rounded w-1/2 mb-2"></div><div className="h-2 bg-gray-100 rounded w-1/3"></div></div>
              </div>
              <div className="f5-card f5-c2 delay-2">
                <Syringe className="text-[var(--color-green-deep)]" size={24}/>
                <div className="flex-1"><div className="h-2 bg-gray-200 rounded w-2/3 mb-2"></div><div className="h-2 bg-gray-100 rounded w-1/4"></div></div>
              </div>
              <div className="f5-card f5-c3 delay-3">
                <FileText className="text-gray-400" size={24}/>
                <div className="flex-1"><div className="h-2 bg-gray-200 rounded w-full mb-2"></div><div className="h-2 bg-gray-100 rounded w-1/2"></div></div>
              </div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Prontuário completo</h1>
          <p className="onboarding-frame-text">
            O histórico do paciente reúne aplicações, evoluções, medicamentos, materiais, lotes e relatórios em um só lugar.
          </p>
        </div>

        {/* Frame 6 */}
        <div className={`onboarding-frame ${currentFrame === 6 ? 'active' : currentFrame > 6 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f6-container">
              <div className="f6-center"><CalendarDays size={32}/></div>
              <div className="f6-satellite f6-s1"><User size={16} className="text-[var(--color-beige-camel)]"/> Paciente</div>
              <div className="f6-satellite f6-s2"><ClipboardList size={16} className="text-[var(--color-green-deep)]"/> Protocolo</div>
              <div className="f6-satellite f6-s3"><Package size={16} className="text-gray-500"/> Estoque</div>
              <div className="f6-satellite f6-s4"><Mail size={16} className="text-[var(--color-info)]"/> E-mail</div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Agenda integrada à operação</h1>
          <p className="onboarding-frame-text">
            Ao agendar uma aplicação, o sistema conecta paciente, protocolo, estoque reservado e comunicação.
          </p>
        </div>

        {/* Frame 7 */}
        <div className={`onboarding-frame ${currentFrame === 7 ? 'active' : currentFrame > 7 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f7-container">
              <div className="f7-blocks">
                <div className="f7-block delay-1 flex items-center px-3 text-xs text-gray-400"><Syringe size={14} className="mr-2"/> Aplicação</div>
                <div className="f7-block delay-2 flex items-center px-3 text-xs text-gray-400"><Package size={14} className="mr-2"/> Lotes</div>
                <div className="f7-block delay-3 flex items-center px-3 text-xs text-gray-400"><User size={14} className="mr-2"/> Paciente</div>
              </div>
              <div className="f7-arrow delay-4"><ChevronRight size={32}/></div>
              <div className="f7-doc delay-5">
                <FileText size={24} className="text-[var(--color-green-deep)] mb-2"/>
                <div className="f7-line-1"></div>
                <div className="f7-line-2"></div>
                <div className="f7-line-3"></div>
              </div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Relatórios e evolução automática</h1>
          <p className="onboarding-frame-text">
            Transforme registros clínicos em evoluções e relatórios organizados, claros e rastreáveis.
          </p>
        </div>

        {/* Frame 8 */}
        <div className={`onboarding-frame ${currentFrame === 8 ? 'active' : currentFrame > 8 ? 'previous' : ''}`}>
          <div className="onboarding-visual mb-8">
            <div className="f8-container">
              <div className="f8-logo delay-1"><PlayCircle size={120} /></div>
              <div className="f8-content delay-2">
                <div className="w-20 h-20 rounded-full bg-[var(--color-green-deep)] text-white flex items-center justify-center shadow-lg">
                  <CheckCircle2 size={40}/>
                </div>
              </div>
            </div>
          </div>
          <h1 className="onboarding-frame-title">Tudo pronto, Dra. Ana</h1>
          <p className="onboarding-frame-text">
            Você já pode começar a usar o sistema com mais clareza, segurança e organização. Este onboarding poderá ser revisto depois em Configurações.
          </p>
        </div>
      </div>

      <footer className="onboarding-footer">
        <div className="onboarding-progress-container">
          <div className="onboarding-progress-bar">
            {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
              <div 
                key={i} 
                className={`onboarding-progress-dot ${currentFrame === i + 1 ? 'active' : currentFrame > i + 1 ? 'completed' : ''}`}
              />
            ))}
          </div>
          <div className="onboarding-progress-text">
            {currentFrame} / {TOTAL_FRAMES}
          </div>
        </div>

        <div className="onboarding-controls">
          <div>
            {currentFrame < TOTAL_FRAMES && (
              <button onClick={handleSkip} className="onboarding-btn onboarding-btn-ghost">
                Pular
              </button>
            )}
            {currentFrame === TOTAL_FRAMES && (
              <button onClick={() => { setCurrentFrame(1); }} className="onboarding-btn onboarding-btn-ghost">
                Rever experiência
              </button>
            )}
          </div>

          <div className="flex gap-4">
            {currentFrame > 1 && (
              <button onClick={handlePrev} className="onboarding-btn onboarding-btn-secondary">
                <ChevronLeft size={20} /> Voltar
              </button>
            )}
            {currentFrame === 1 && (
              <button onClick={handleNext} className="onboarding-btn onboarding-btn-primary">
                Iniciar experiência <ChevronRight size={20} />
              </button>
            )}
            {currentFrame > 1 && currentFrame < TOTAL_FRAMES && (
              <button onClick={handleNext} className="onboarding-btn onboarding-btn-primary">
                Próximo <ChevronRight size={20} />
              </button>
            )}
            {currentFrame === TOTAL_FRAMES && (
              <button onClick={handleFinish} className="onboarding-btn onboarding-btn-primary">
                Acessar sistema <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

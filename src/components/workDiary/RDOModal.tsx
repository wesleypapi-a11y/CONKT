import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiary, RDOStatus, WeatherType, WeatherCondition, WorkDiaryLabor, WorkDiaryActivity, WorkDiaryOccurrence, WorkDiaryComment, WorkDiaryPhoto, WorkDiaryVideo, WorkDiaryAttachment } from '../../types/workDiary';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';

interface RDOModalProps {
  isOpen: boolean;
  onClose: () => void;
  rdoId?: string;
  preSelectedWorkId?: string;
  viewOnly?: boolean;
}

export default function RDOModal({ isOpen, onClose, rdoId, preSelectedWorkId, viewOnly = false }: RDOModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [currentRdoId, setCurrentRdoId] = useState<string | undefined>(rdoId);

  // RDO State
  const [rdo, setRdo] = useState<Partial<WorkDiary>>({
    morning_weather: 'claro',
    morning_condition: 'praticavel',
    afternoon_weather: 'claro',
    afternoon_condition: 'praticavel',
    night_weather: 'claro',
    night_condition: 'praticavel',
    status: 'aprovado',
    report_date: new Date().toISOString().split('T')[0]
  });

  // Copy options
  const [copyFromLast, setCopyFromLast] = useState(false);
  const [copyFromSpecific, setCopyFromSpecific] = useState(false);
  const [specificDate, setSpecificDate] = useState('');

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    labor: false,
    activities: false,
    occurrences: false,
    comments: false,
    photos: false,
    videos: false,
    attachments: false
  });

  // Lists for expandable sections
  const [laborList, setLaborList] = useState<WorkDiaryLabor[]>([]);
  const [activitiesList, setActivitiesList] = useState<WorkDiaryActivity[]>([]);
  const [occurrencesList, setOccurrencesList] = useState<WorkDiaryOccurrence[]>([]);
  const [commentsList, setCommentsList] = useState<WorkDiaryComment[]>([]);
  const [photosList, setPhotosList] = useState<WorkDiaryPhoto[]>([]);
  const [videosList, setVideosList] = useState<WorkDiaryVideo[]>([]);
  const [attachmentsList, setAttachmentsList] = useState<WorkDiaryAttachment[]>([]);

  // Form states for adding items
  const [laborForm, setLaborForm] = useState({ name: '', quantity: 1, observation: '' });
  const [activityForm, setActivityForm] = useState({ description: '', progress: 0, observation: '' });
  const [occurrenceForm, setOccurrenceForm] = useState({ description: '', type: '' });
  const [commentForm, setCommentForm] = useState({ comment: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadWorks();
      if (rdoId) {
        setCurrentRdoId(rdoId);
        loadRDO();
        loadAllLists();
      } else {
        setCurrentRdoId(undefined);
        resetForm();
      }
    }
  }, [isOpen, rdoId, user]);

  useEffect(() => {
    if (rdo.work_id && works.length > 0) {
      const work = works.find(w => w.id === rdo.work_id);
      setSelectedWork(work || null);
    }
  }, [rdo.work_id, works]);

  // Buscar o próximo report_number quando criar novo RDO
  useEffect(() => {
    const fetchNextReportNumber = async () => {
      if (!rdoId && rdo.work_id && user) {
        try {
          const { data, error } = await supabase
            .from('work_diaries')
            .select('report_number')
            .eq('work_id', rdo.work_id)
            .eq('user_id', user.id)
            .order('report_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          const nextNumber = data ? (data.report_number || 0) + 1 : 1;
          setRdo(prev => ({ ...prev, report_number: nextNumber }));
        } catch (error) {
          console.error('Error fetching next report number:', error);
        }
      }
    };

    fetchNextReportNumber();
  }, [rdoId, rdo.work_id, user]);

  useEffect(() => {
    if (rdoId) {
      loadAllLists();
    }
  }, [rdoId]);

  // Auto-expand sections when in view mode
  useEffect(() => {
    if (viewOnly && rdoId) {
      setExpandedSections({
        labor: laborList.length > 0,
        activities: activitiesList.length > 0,
        occurrences: occurrencesList.length > 0,
        comments: commentsList.length > 0,
        photos: photosList.length > 0,
        videos: videosList.length > 0,
        attachments: attachmentsList.length > 0
      });
    }
  }, [viewOnly, laborList, activitiesList, occurrencesList, commentsList, photosList, videosList, attachmentsList]);

  const resetForm = () => {
    setRdo({
      work_id: preSelectedWorkId,
      morning_weather: 'claro',
      morning_condition: 'praticavel',
      afternoon_weather: 'claro',
      afternoon_condition: 'praticavel',
      night_weather: 'claro',
      night_condition: 'praticavel',
      status: 'aprovado',
      report_date: new Date().toISOString().split('T')[0]
    });
    setSelectedWork(null);
    setLaborList([]);
    setActivitiesList([]);
    setOccurrencesList([]);
    setCommentsList([]);
    setPhotosList([]);
    setVideosList([]);
    setAttachmentsList([]);
  };

  const loadWorks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const loadRDO = async (id?: string) => {
    const targetId = id || rdoId;
    if (!targetId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw error;
      if (data) setRdo(data);
    } catch (error) {
      console.error('Error loading RDO:', error);
      alert('Erro ao carregar RDO');
    } finally {
      setLoading(false);
    }
  };

  const loadAllLists = async (id?: string) => {
    const targetId = id || rdoId;
    if (!targetId) return;

    try {
      const [labor, activities, occurrences, comments, photos, videos, attachments] = await Promise.all([
        supabase.from('work_diary_labor').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_activities').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_occurrences').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_comments').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_photos').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_videos').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true }),
        supabase.from('work_diary_attachments').select('*').eq('work_diary_id', targetId).order('created_at', { ascending: true })
      ]);

      setLaborList(labor.data || []);
      setActivitiesList(activities.data || []);
      setOccurrencesList(occurrences.data || []);
      setCommentsList(comments.data || []);
      setPhotosList(photos.data || []);
      setVideosList(videos.data || []);
      setAttachmentsList(attachments.data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const handleCopyFromLast = async () => {
    if (!rdo.work_id || !copyFromLast) return;

    try {
      const { data: lastRdo, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', rdo.work_id)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (lastRdo) {
        setRdo(prev => ({
          ...prev,
          morning_weather: lastRdo.morning_weather,
          morning_condition: lastRdo.morning_condition,
          afternoon_weather: lastRdo.afternoon_weather,
          afternoon_condition: lastRdo.afternoon_condition,
          night_weather: lastRdo.night_weather,
          night_condition: lastRdo.night_condition,
          responsible: lastRdo.responsible
        }));
        alert('Informações copiadas do último relatório!');
      }
    } catch (error) {
      console.error('Error copying from last:', error);
    }
  };

  const handleCopyFromSpecific = async () => {
    if (!rdo.work_id || !copyFromSpecific || !specificDate) return;

    try {
      const { data: specificRdo, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', rdo.work_id)
        .eq('report_date', specificDate)
        .maybeSingle();

      if (error) throw error;
      if (specificRdo) {
        setRdo(prev => ({
          ...prev,
          morning_weather: specificRdo.morning_weather,
          morning_condition: specificRdo.morning_condition,
          afternoon_weather: specificRdo.afternoon_weather,
          afternoon_condition: specificRdo.afternoon_condition,
          night_weather: specificRdo.night_weather,
          night_condition: specificRdo.night_condition,
          responsible: specificRdo.responsible
        }));
        alert('Informações copiadas do relatório específico!');
      }
    } catch (error) {
      console.error('Error copying from specific:', error);
    }
  };

  useEffect(() => {
    if (copyFromLast) handleCopyFromLast();
  }, [copyFromLast]);

  useEffect(() => {
    if (copyFromSpecific && specificDate) handleCopyFromSpecific();
  }, [copyFromSpecific, specificDate]);

  const calculateDates = () => {
    if (!rdo.report_date) return null;

    const date = new Date(rdo.report_date + 'T00:00:00');
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayOfWeek = days[date.getDay()];

    let elapsedDays = 0;
    let remainingDays = 0;

    if (selectedWork?.start_date && selectedWork?.duration) {
      const startDate = new Date(selectedWork.start_date + 'T00:00:00');
      const reportDate = new Date(rdo.report_date + 'T00:00:00');
      elapsedDays = Math.floor((reportDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      remainingDays = selectedWork.duration - elapsedDays;
    }

    return {
      dayOfWeek,
      elapsedDays,
      remainingDays
    };
  };

  const handleSave = async () => {
    if (!rdo.work_id) {
      alert('Selecione uma obra');
      return;
    }

    if (!rdo.report_date) {
      alert('Data do relatório é obrigatória');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const dateInfo = calculateDates();

      const { data: existingRDOForDate, error: checkError } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', rdo.work_id)
        .eq('user_id', user.id)
        .eq('report_date', rdo.report_date)
        .maybeSingle();

      if (checkError) throw checkError;

      let reportNumber = rdo.report_number || 1;
      let targetRdoId = rdoId;

      if (existingRDOForDate && !rdoId) {
        targetRdoId = existingRDOForDate.id;
        reportNumber = existingRDOForDate.report_number;
      } else if (!rdoId && !existingRDOForDate) {
        const { data: lastRDO, error: countError } = await supabase
          .from('work_diaries')
          .select('report_number')
          .eq('work_id', rdo.work_id)
          .eq('user_id', user.id)
          .order('report_number', { ascending: false })
          .limit(1);

        if (countError) throw countError;
        if (lastRDO && lastRDO.length > 0) {
          reportNumber = (lastRDO[0].report_number || 0) + 1;
        }
      }

      const rdoData = {
        ...rdo,
        day_of_week: dateInfo?.dayOfWeek || '',
        report_number: reportNumber,
        elapsed_days: dateInfo?.elapsedDays || 0,
        remaining_days: dateInfo?.remainingDays || 0,
        contracted_days: selectedWork?.duration || 0,
        contract_number: selectedWork?.cno || '',
        user_id: user.id
      };

      let savedRdoId = targetRdoId;

      if (targetRdoId) {
        const { error } = await supabase
          .from('work_diaries')
          .update({
            ...rdoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetRdoId);

        if (error) throw error;
        if (!rdoId) {
          setRdo({ ...rdoData, id: targetRdoId });
        }
      } else {
        const { data: newRdo, error } = await supabase
          .from('work_diaries')
          .insert(rdoData)
          .select()
          .single();

        if (error) throw error;
        if (newRdo) {
          savedRdoId = newRdo.id;
          setCurrentRdoId(newRdo.id);
          setRdo(newRdo);
        }
      }

      // Salvar todos os itens das abas
      if (savedRdoId) {
        // Salvar mão de obra
        for (const labor of laborList.filter(l => l.id.startsWith('temp-'))) {
          await supabase.from('work_diary_labor').insert({
            work_diary_id: savedRdoId,
            name: labor.name,
            quantity: labor.quantity,
            observation: labor.observation
          });
        }

        // Salvar atividades
        for (const activity of activitiesList.filter(a => a.id.startsWith('temp-'))) {
          await supabase.from('work_diary_activities').insert({
            work_diary_id: savedRdoId,
            description: activity.description,
            progress: activity.progress,
            observation: activity.observation
          });
        }

        // Salvar ocorrências
        for (const occurrence of occurrencesList.filter(o => o.id.startsWith('temp-'))) {
          await supabase.from('work_diary_occurrences').insert({
            work_diary_id: savedRdoId,
            description: occurrence.description,
            type: occurrence.type
          });
        }

        // Salvar comentários
        for (const comment of commentsList.filter(c => c.id.startsWith('temp-'))) {
          await supabase.from('work_diary_comments').insert({
            work_diary_id: savedRdoId,
            comment: comment.comment
          });
        }

        // Salvar fotos
        for (const photo of photosList.filter(p => p.id.startsWith('temp-'))) {
          if ((photo as any).file) {
            const file = (photo as any).file;
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `work_diaries/${savedRdoId}/photos/${timestamp}_${file.name}`;

            const { error: uploadError } = await supabase.storage
              .from('work-diary-photos')
              .upload(fileName, file);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('work-diary-photos')
                .getPublicUrl(fileName);

              await supabase.from('work_diary_photos').insert({
                work_diary_id: savedRdoId,
                user_id: user.id,
                file_name: file.name,
                file_path: publicUrl,
                file_size: file.size,
                description: photo.description || null
              });
            }
          }
        }

        // Salvar vídeos
        for (const video of videosList.filter(v => v.id.startsWith('temp-'))) {
          if ((video as any).file) {
            const file = (video as any).file;
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `work_diaries/${savedRdoId}/videos/${timestamp}_${file.name}`;

            const { error: uploadError } = await supabase.storage
              .from('work-diary-videos')
              .upload(fileName, file);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('work-diary-videos')
                .getPublicUrl(fileName);

              await supabase.from('work_diary_videos').insert({
                work_diary_id: savedRdoId,
                user_id: user.id,
                file_name: file.name,
                file_path: publicUrl,
                file_size: file.size,
                description: video.description || null
              });
            }
          }
        }

        // Salvar anexos
        for (const attachment of attachmentsList.filter(a => a.id.startsWith('temp-'))) {
          if ((attachment as any).file) {
            const file = (attachment as any).file;
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `work_diaries/${savedRdoId}/attachments/${timestamp}_${file.name}`;

            const { error: uploadError } = await supabase.storage
              .from('work-diary-attachments')
              .upload(fileName, file);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('work-diary-attachments')
                .getPublicUrl(fileName);

              await supabase.from('work_diary_attachments').insert({
                work_diary_id: savedRdoId,
                user_id: user.id,
                file_name: file.name,
                file_path: publicUrl,
                file_size: file.size,
                file_type: file.type
              });
            }
          }
        }
      }

      const finalRdoId = savedRdoId || currentRdoId;
      if (finalRdoId) {
        await loadRDO(finalRdoId);
        await loadAllLists(finalRdoId);
      }

      alert('RDO salvo com sucesso!');
    } catch (error) {
      console.error('Error saving RDO:', error);
      alert('Erro ao salvar RDO');
    } finally {
      setSaving(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Função para compactar imagem
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar se a imagem for muito grande
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
    });
  };

  // Upload photo handler - trabalha com state local
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const compressedPhotos: File[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      compressedPhotos.push(compressed);
    }

    const photosToAdd = compressedPhotos.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      user_id: user?.id || '',
      file_path: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      description: file.name,
      created_at: new Date().toISOString(),
      file: file
    }));

    setPhotosList(prev => [...prev, ...photosToAdd as any]);
    event.target.value = '';
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validVideos: File[] = [];
    const invalidVideos: string[] = [];

    const validateVideo = (file: File): Promise<boolean> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const duration = video.duration;

          if (duration > 60) {
            invalidVideos.push(`${file.name} (${Math.round(duration)}s)`);
            resolve(false);
          } else {
            resolve(true);
          }
        };

        video.onerror = () => {
          window.URL.revokeObjectURL(video.src);
          invalidVideos.push(`${file.name} (erro ao carregar)`);
          resolve(false);
        };

        video.src = URL.createObjectURL(file);
      });
    };

    for (const file of fileArray) {
      const isValid = await validateVideo(file);
      if (isValid) {
        validVideos.push(file);
      }
    }

    if (invalidVideos.length > 0) {
      alert(`Os seguintes vídeos não foram adicionados:\n\n${invalidVideos.join('\n')}\n\nVídeos devem ter no máximo 60 segundos.`);
    }

    if (validVideos.length > 0) {
      const videosToAdd = validVideos.map(validFile => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        work_diary_id: rdoId || '',
        user_id: user?.id || '',
        file_path: URL.createObjectURL(validFile),
        file_name: validFile.name,
        file_size: validFile.size,
        description: validFile.name,
        created_at: new Date().toISOString(),
        file: validFile
      }));

      setVideosList(prev => [...prev, ...videosToAdd as any]);
    }

    event.target.value = '';
  };

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: File[] = [];
    for (const file of Array.from(files)) {
      newAttachments.push(file);
    }

    const attachmentsToAdd = newAttachments.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      user_id: user?.id || '',
      file_path: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      created_at: new Date().toISOString(),
      file: file
    }));

    setAttachmentsList(prev => [...prev, ...attachmentsToAdd as any]);
    event.target.value = '';
  };

  const deletePhoto = (photoId: string) => {
    setPhotosList(prev => prev.filter(p => p.id !== photoId));
  };

  const deleteVideo = (videoId: string) => {
    setVideosList(prev => prev.filter(v => v.id !== videoId));
  };

  const deleteAttachment = (attachmentId: string) => {
    setAttachmentsList(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Add/Delete handlers for Labor - trabalha com state local
  const addLabor = () => {
    if (!laborForm.name.trim()) return;

    const newLabor: WorkDiaryLabor = {
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      name: laborForm.name,
      quantity: 1,
      observation: undefined,
      created_at: new Date().toISOString()
    };

    setLaborList(prev => [...prev, newLabor]);
    setLaborForm({ name: '', quantity: 1, observation: '' });
  };

  const deleteLabor = (id: string) => {
    setLaborList(prev => prev.filter(l => l.id !== id));
  };

  // Add/Delete handlers for Activities
  const addActivity = () => {
    if (!activityForm.description.trim()) return;

    const newActivity: WorkDiaryActivity = {
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      description: activityForm.description,
      progress: undefined,
      observation: undefined,
      created_at: new Date().toISOString()
    };

    setActivitiesList(prev => [...prev, newActivity]);
    setActivityForm({ description: '', progress: 0, observation: '' });
  };

  const deleteActivity = (id: string) => {
    setActivitiesList(prev => prev.filter(a => a.id !== id));
  };

  // Add/Delete handlers for Occurrences
  const addOccurrence = () => {
    if (!occurrenceForm.description.trim()) return;

    const newOccurrence: WorkDiaryOccurrence = {
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      description: occurrenceForm.description,
      type: undefined,
      created_at: new Date().toISOString()
    };

    setOccurrencesList(prev => [...prev, newOccurrence]);
    setOccurrenceForm({ description: '', type: '' });
  };

  const deleteOccurrence = (id: string) => {
    setOccurrencesList(prev => prev.filter(o => o.id !== id));
  };

  // Add/Delete handlers for Comments
  const addComment = () => {
    if (!commentForm.comment.trim()) return;

    const newComment: WorkDiaryComment = {
      id: `temp-${Date.now()}-${Math.random()}`,
      work_diary_id: rdoId || '',
      comment: commentForm.comment,
      created_at: new Date().toISOString()
    };

    setCommentsList(prev => [...prev, newComment]);
    setCommentForm({ comment: '' });
  };

  const deleteComment = (id: string) => {
    setCommentsList(prev => prev.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  const weatherOptions: { value: WeatherType; label: string }[] = [
    { value: 'claro', label: 'Claro' },
    { value: 'nublado', label: 'Nublado' },
    { value: 'chuvoso', label: 'Chuvoso' }
  ];

  const conditionOptions: { value: WeatherCondition; label: string }[] = [
    { value: 'praticavel', label: 'Praticável' },
    { value: 'impraticavel', label: 'Impraticável' }
  ];

  const periods = [
    { key: 'morning', label: 'Manhã' },
    { key: 'afternoon', label: 'Tarde' },
    { key: 'night', label: 'Noite' }
  ];

  return (
    <div className="fixed inset-0 lg:left-64 z-40 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-lg sm:rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200 rounded-t-lg sm:rounded-t-xl">
          <div className="flex items-center gap-2 sm:gap-4">
            <img
              src="/logo_conkt-removebg-preview.png"
              alt="CONKT"
              className="h-8 sm:h-10"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h2 className="text-base sm:text-xl font-bold text-gray-800">
              RDO
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-3 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>
            ) : (
              <div className="space-y-3 sm:space-y-6">
                  {/* Work Selection */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selecione uma obra <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={rdo.work_id || ''}
                          onChange={(e) => setRdo(prev => ({ ...prev, work_id: e.target.value }))}
                          disabled={viewOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          style={{}}
                        >
                          <option value="">Selecione uma obra...</option>
                          {works.map((work) => (
                            <option key={work.id} value={work.id}>
                              {work.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data do relatório <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={rdo.report_date || ''}
                          onChange={(e) => setRdo(prev => ({ ...prev, report_date: e.target.value }))}
                          disabled={viewOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          style={{}}
                        />
                      </div>

                      <div></div>

                      <div className="md:col-span-2 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={copyFromLast}
                            onChange={(e) => {
                              setCopyFromLast(e.target.checked);
                              if (e.target.checked) setCopyFromSpecific(false);
                            }}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: conktColors.primary.blue }}
                            disabled={!rdo.work_id}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Copiar informações do último relatório
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={copyFromSpecific}
                              onChange={(e) => {
                                setCopyFromSpecific(e.target.checked);
                                if (e.target.checked) setCopyFromLast(false);
                              }}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: conktColors.primary.blue }}
                              disabled={!rdo.work_id}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Copiar de um relatório específico (data)
                            </span>
                          </label>
                          {copyFromSpecific && (
                            <input
                              type="date"
                              value={specificDate}
                              onChange={(e) => setSpecificDate(e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm"
                              style={{}}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work Details */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Obra
                        </label>
                        <input
                          type="text"
                          value={selectedWork?.name || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={selectedWork?.work_address || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Responsável
                        </label>
                        <input
                          type="text"
                          value={rdo.responsible || ''}
                          onChange={(e) => setRdo(prev => ({ ...prev, responsible: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                          style={{}}
                          placeholder="Nome do responsável"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Weather Table */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Clima</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Período
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Tempo
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Condição
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {periods.map((period) => (
                            <tr key={period.key} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700">
                                {period.label}
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
                                <div className="flex gap-4">
                                  {weatherOptions.map((option) => (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        name={`${period.key}_weather`}
                                        value={option.value}
                                        checked={rdo[`${period.key}_weather` as keyof WorkDiary] === option.value}
                                        onChange={(e) => setRdo(prev => ({ ...prev, [`${period.key}_weather`]: e.target.value as WeatherType }))}
                                        className="w-4 h-4"
                                        style={{ accentColor: conktColors.primary.blue }}
                                      />
                                      <span className="text-sm text-gray-700">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
                                <div className="flex gap-4">
                                  {conditionOptions.map((option) => (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        name={`${period.key}_condition`}
                                        value={option.value}
                                        checked={rdo[`${period.key}_condition` as keyof WorkDiary] === option.value}
                                        onChange={(e) => setRdo(prev => ({ ...prev, [`${period.key}_condition`]: e.target.value as WeatherCondition }))}
                                        className="w-4 h-4"
                                        style={{ accentColor: conktColors.primary.blue }}
                                      />
                                      <span className="text-sm text-gray-700">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* Abas Obrigatórias */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      {/* Tabs Header */}
                      {/* Todas as seções em layout vertical */}
                      <div className="p-4 sm:p-6 space-y-8">
                        {/* Mão de obra */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Mão de obra
                          </h3>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Digite o nome"
                              value={laborForm.name}
                              onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addLabor();
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                              style={{}}
                            />
                            <button
                              onClick={addLabor}
                              className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: conktColors.primary.blue }}
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {laborList.map((labor) => (
                              <div key={labor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="font-medium text-gray-900">{labor.name}</div>
                                <button
                                  onClick={() => deleteLabor(labor.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {laborList.length === 0 && (
                              <div className="text-center py-8 text-gray-400">
                                Nenhuma mão de obra adicionada
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Atividades */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Atividades
                          </h3>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Digite a descrição"
                              value={activityForm.description}
                              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addActivity();
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                              style={{}}
                            />
                            <button
                              onClick={addActivity}
                              className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: conktColors.primary.blue }}
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {activitiesList.map((activity) => (
                              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 font-medium text-gray-900">{activity.description}</div>
                                <button
                                  onClick={() => deleteActivity(activity.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {activitiesList.length === 0 && (
                              <div className="text-center py-8 text-gray-400">
                                Nenhuma atividade adicionada
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ocorrências */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Ocorrências
                          </h3>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Digite a ocorrência"
                              value={occurrenceForm.description}
                              onChange={(e) => setOccurrenceForm({ ...occurrenceForm, description: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addOccurrence();
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                              style={{}}
                            />
                            <button
                              onClick={addOccurrence}
                              className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: conktColors.primary.blue }}
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {occurrencesList.map((occurrence) => (
                              <div key={occurrence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 font-medium text-gray-900">{occurrence.description}</div>
                                <button
                                  onClick={() => deleteOccurrence(occurrence.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {occurrencesList.length === 0 && (
                              <div className="text-center py-8 text-gray-400">
                                Nenhuma ocorrência adicionada
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Comentários */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Comentários
                          </h3>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Digite o comentário"
                              value={commentForm.comment}
                              onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addComment();
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                              style={{}}
                            />
                            <button
                              onClick={addComment}
                              className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: conktColors.primary.blue }}
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {commentsList.map((comment) => (
                              <div key={comment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 font-medium text-gray-900">{comment.comment}</div>
                                <button
                                  onClick={() => deleteComment(comment.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {commentsList.length === 0 && (
                              <div className="text-center py-8 text-gray-400">
                                Nenhum comentário adicionado
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fotos */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Fotos
                          </h3>
                          {!viewOnly && (
                            <>
                              <label
                                htmlFor="photo-upload"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex"
                                style={{ backgroundColor: conktColors.primary.blue }}
                              >
                                <Upload className="w-5 h-5" />
                                Adicionar Fotos
                              </label>
                              <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photosList.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <img
                                  src={photo.file_path}
                                  alt={photo.description || 'Foto do RDO'}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                />
                                {!viewOnly && (
                                  <button
                                    onClick={() => deletePhoto(photo.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {photo.description && (
                                  <div className="mt-2 text-xs text-gray-600 truncate">
                                    {photo.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {photosList.length === 0 && (
                            <div className="text-center py-8">
                              <ImageIcon className="w-16 h-16 mx-auto text-gray-900 mb-3" />
                              <p className="text-gray-400">Nenhuma foto adicionada</p>
                            </div>
                          )}
                        </div>

                        {/* Vídeos */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Vídeos
                          </h3>
                          {!viewOnly && (
                            <>
                              <label
                                htmlFor="video-upload"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex"
                                style={{ backgroundColor: conktColors.primary.blue }}
                              >
                                <Upload className="w-5 h-5" />
                                Adicionar Vídeos
                              </label>
                              <input
                                id="video-upload"
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={handleVideoUpload}
                                className="hidden"
                              />
                            </>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {videosList.map((video) => (
                              <div key={video.id} className="relative group">
                                <video
                                  src={video.file_path}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                  controls
                                />
                                {!viewOnly && (
                                  <button
                                    onClick={() => deleteVideo(video.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {video.description && (
                                  <div className="mt-2 text-xs text-gray-600 truncate">
                                    {video.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {videosList.length === 0 && (
                            <div className="text-center py-8">
                              <Video className="w-16 h-16 mx-auto text-gray-900 mb-3" />
                              <p className="text-gray-400">Nenhum vídeo adicionado</p>
                            </div>
                          )}
                        </div>

                        {/* Anexos */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2" style={{ borderColor: conktColors.primary.blue }}>
                            Anexos
                          </h3>
                          {!viewOnly && (
                            <>
                              <label
                                htmlFor="attachment-upload"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex"
                                style={{ backgroundColor: conktColors.primary.blue }}
                              >
                                <Upload className="w-5 h-5" />
                                Adicionar Anexos
                              </label>
                              <input
                                id="attachment-upload"
                                type="file"
                                multiple
                                onChange={handleAttachmentUpload}
                                className="hidden"
                              />
                            </>
                          )}

                          <div className="space-y-2">
                            {attachmentsList.map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Paperclip className="w-5 h-5 text-gray-400" />
                                  <div className="font-medium text-gray-900">{attachment.file_name}</div>
                                </div>
                                {!viewOnly && (
                                  <button
                                    onClick={() => deleteAttachment(attachment.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {attachmentsList.length === 0 && (
                            <div className="text-center py-8">
                              <Paperclip className="w-16 h-16 mx-auto text-gray-900 mb-3" />
                              <p className="text-gray-400">Nenhum anexo adicionado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-200 rounded-b-lg sm:rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 rounded-lg font-medium border-2 hover:bg-gray-50 transition-colors order-2 sm:order-1"
            style={{ borderColor: conktColors.neutral.gray300, color: conktColors.neutral.gray700 }}
          >
            Fechar
          </button>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            {!viewOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 sm:px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm sm:text-base"
                style={{ backgroundColor: conktColors.status.success }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

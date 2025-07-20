import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/Teacher/CreateQuiz.css';
import { FaTrashAlt, FaPlus, FaClipboard, FaTimes, FaArrowLeft, FaPhotoVideo, FaGripLines, FaSave, FaLaptop, FaPaste, FaEdit } from 'react-icons/fa';
import ImageKit from 'imagekit-javascript';
import MediaPreview from '../../components/MediaPreview';
import ImageEditorModal from '../../components/ImageEditorModal';
// just some testings

// Initialize ImageKit globally.
const imagekit = new ImageKit({
    publicKey: import.meta.env.VITE_PUBLIC_KEY,
    urlEndpoint: import.meta.env.VITE_URL_ENDPOINT,
    authenticationEndpoint: `${import.meta.env.VITE_API_URL || ''}/api/auth`
});

const generateNewQuestion = (type) => {
    const baseQuestion = { id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, type, questionText: '', points: 10, timeLimit: 60, media: null, localMediaFile: null, localCropData: null };
    switch (type) {
        case 'MCQ': return { ...baseQuestion, mcqData: { options: [{ id: Date.now() + 1, text: '', media: null, localMediaFile: null, localCropData: null }, { id: Date.now() + 2, text: '', media: null, localMediaFile: null, localCropData: null }], correctOptions: [] } };
        case 'FILL_IN_THE_BLANK': return { ...baseQuestion, fillBlankData: { answers: [{ text: '' }], caseSensitive: false } };
        case 'PARAGRAPH': return { ...baseQuestion, paragraphData: { keywords: [{ text: '' }] } };
        case 'MATCH_THE_FOLLOWING': return { ...baseQuestion, points: 20, matchData: { pairs: [{ id: Date.now(), prompt: '', promptMedia: null, promptLocalMediaFile: null, promptLocalCropData: null, answer: '', answerMedia: null, answerLocalMediaFile: null, answerLocalCropData: null }] } };
        case 'CATEGORIZE': return { ...baseQuestion, points: 20, categorizeData: { categories: [{ id: Date.now(), name: 'Category 1' }], items: [{ id: Date.now() + 1, text: '', categoryId: null, media: null, localMediaFile: null, localCropData: null }] } };
        case 'REORDER': return { ...baseQuestion, reorderData: { items: [{ id: Date.now(), text: '', media: null, localMediaFile: null, localCropData: null }] } };
        case 'VISUAL_COMPREHENSION': return { ...baseQuestion, points: 20, visualData: { mainMedia: null, localMainMediaFile: null, localCropData: null, subQuestions: [generateNewQuestion('MCQ')] } };
        case 'LISTENING_COMPREHENSION': return { ...baseQuestion, points: 20, listeningData: { mainMedia: null, localMainMediaFile: null, subQuestions: [generateNewQuestion('MCQ')] } };
        default: return { ...baseQuestion, mcqData: { options: [{ id: Date.now() + 1, text: '', media: null, localMediaFile: null, localCropData: null }, { id: Date.now() + 2, text: '', media: null, localMediaFile: null, localCropData: null }], correctOptions: [] } };
        }
    };

const UploadChoiceModal = ({ onChoice, onClose }) => ( <div className="upload-choice-modal-overlay" onClick={onClose}><div className="upload-choice-modal-content" onClick={(e) => e.stopPropagation()}><h3>Add Media</h3><p>Choose how you want to add your media file.</p><div className="upload-choices"><button onClick={() => onChoice('upload')} className="upload-choice-btn"><FaLaptop /><span>Upload from Computer</span></button><button onClick={() => onChoice('paste')} className="upload-choice-btn"><FaPaste /><span>Paste from Clipboard</span></button></div><button className="close-modal-btn-simple" onClick={onClose}><FaTimes /></button></div></div> );

const CreateQuiz = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();

    const [quizType, setQuizType] = useState(location.state?.quizType || 'MIXED');
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [questions, setQuestions] = useState([generateNewQuestion('MCQ')]);
    const [isPublished, setIsPublished] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editorState, setEditorState] = useState({ isOpen: false, imageSrc: null, target: null });

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [mediaTarget, setMediaTarget] = useState(null);
    const hiddenFileInput = useRef(null);

    useEffect(() => {
        if (currentUser) {
            const fetchUserData = async () => {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                setUserDisplayName(userDocSnap.exists() ? userDocSnap.data().displayName || 'Teacher' : 'Teacher');
                setLoading(false);
            };
            fetchUserData();
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    // NEW: Effect to control body scroll when modal is open
    useEffect(() => {
        if (editorState.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset'; // Or 'auto'
        }
        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset'; // Ensure it's reset on unmount
        };
    }, [editorState.isOpen]);

    const updateQuestionState = (qIndex, updateCallback) => {
        setQuestions(currentQuestions => currentQuestions.map((q, i) => i === qIndex ? updateCallback(q) : q));
    };

    const handleAddQuestion = () => setQuestions(current => [...current, generateNewQuestion(quizType === 'MIXED' ? 'MCQ' : quizType)]);
    const handleRemoveQuestion = (qIndex) => questions.length > 1 && setQuestions(current => current.filter((_, i) => i !== qIndex));
    const handleQuestionChange = (qIndex, field, value) => { updateQuestionState(qIndex, q => ({ ...q, [field]: value })); };
    const handleQuestionTypeChange = (qIndex, newType) => {
        const old = questions[qIndex];
        const newQuestion = { ...generateNewQuestion(newType), id: old.id, questionText: old.questionText, points: old.points, timeLimit: old.timeLimit };
        setQuestions(current => current.map((q, i) => i === qIndex ? newQuestion : q));
    };

    const openUploadModal = (target) => { setMediaTarget(target); setIsUploadModalOpen(true); };

    const handleUploadChoice = async (choice) => {
        if (!mediaTarget) return;
        setIsUploadModalOpen(false);
        if (choice === 'upload') {
            hiddenFileInput.current.click();
        }
        else if (choice === 'paste') {
            try {
                const clipboardItems = await navigator.clipboard.read();
                const imageItem = clipboardItems.find(item => item.types.some(type => type.startsWith('image/')));
                if (imageItem) {
                    const blob = await imageItem.getType(imageItem.types.find(t => t.startsWith('image/')));
                    const imageFile = new File([blob], `pasted-image.png`, { type: blob.type });
                    handleEditMedia(mediaTarget, imageFile);
                } else {
                    setError('No image found on clipboard.');
                }
            } catch (err) {
                setError('Could not read image from clipboard. Please grant permission or try uploading.');
            }
        }
    };

    const handleFileInputChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            if (file.type && file.type.startsWith('image/')) {
                handleEditMedia(mediaTarget, file);
            } else {
                handleFile(file, null, mediaTarget);
            }
            event.target.value = null;
        }
    };

    const handleEditMedia = (target, fileToEditOverride = null) => {
        const { qIndex, field, oIndex, pairIndex, itemIndex } = target;
        const q = questions[qIndex];
        let fileToEdit = fileToEditOverride;

        if (!fileToEdit) {
            if (field === 'questionMedia') { fileToEdit = q.localMediaFile || q.media; }
            else if (field === 'mcqOptionMedia') { fileToEdit = q.mcqData.options[oIndex].localMediaFile || q.mcqData.options[oIndex].media; }
            else if (field === 'matchPromptMedia') { fileToEdit = q.matchData.pairs[pairIndex].promptLocalMediaFile || q.matchData.pairs[pairIndex].promptMedia; }
            else if (field === 'matchAnswerMedia') { fileToEdit = q.matchData.pairs[pairIndex].answerLocalMediaFile || q.matchData.pairs[pairIndex].answerMedia; }
            else if (field === 'categorizeItemMedia') { fileToEdit = q.categorizeData.items[itemIndex].localMediaFile || q.categorizeData.items[itemIndex].media; }
            else if (field === 'reorderItemMedia') { fileToEdit = q.reorderData.items[itemIndex].localMediaFile || q.reorderData.items[itemIndex].media; }
            else if (field === 'visualMainMedia') { fileToEdit = q.visualData.localMainMediaFile || q.visualData.mainMedia; }
            else if (field === 'listeningMainMedia') {
                setError("Audio/Video files cannot be edited with the image editor.");
                return;
            }
        }

        if (fileToEdit) {
            const isImage = (fileToEdit instanceof File && fileToEdit.type.startsWith('image/')) || (fileToEdit.url && /\.(jpe?g|png|gif|webp|svg)$/i.test(fileToEdit.url));

            if (!isImage) {
                setError("Only image files can be edited with the advanced editor.");
                return;
            }

            console.log("handleEditMedia: fileToEdit found:", fileToEdit);
            const processFileForEditor = (fileObj) => {
                const reader = new FileReader();
                reader.onload = () => {
                    console.log("FileReader onload: setting editorState with imageSrc (snippet):", reader.result.substring(0, 50) + "...");
                    setEditorState({ isOpen: true, imageSrc: reader.result, target });
                };
                reader.onerror = (err) => {
                    console.error("FileReader error:", err);
                    setError("Could not read file for editing.");
                };
                reader.readAsDataURL(fileObj);
            };

            if (fileToEdit.url) {
                console.log("File is from URL, fetching:", fileToEdit.url);
                fetch(fileToEdit.url)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        return res.blob();
                    })
                    .then(blob => {
                        console.log("Fetched blob:", blob);
                        const localFile = new File([blob], fileToEdit.name || "image.png", {type: blob.type});
                        processFileForEditor(localFile);
                    })
                    .catch(err => {
                        console.error("Error fetching image for editing:", err);
                        setError("Could not fetch image for editing. Please check network or CORS.");
                    });
            } else if (fileToEdit instanceof File) {
                console.log("File is local File object:", fileToEdit);
                processFileForEditor(fileToEdit);
            } else {
                console.warn("fileToEdit is not a File object nor has a URL:", fileToEdit);
                setError("Invalid media file for editing.");
            }
        } else {
            console.log("handleEditMedia: No fileToEdit found for target:", target);
            setError("No media found to edit.");
        }
    };

    const handleImageEditComplete = (editedFile) => {
        handleFile(editedFile, null, editorState.target);
        setEditorState({ isOpen: false, imageSrc: null, target: null });
    };

    const handleRemoveMedia = () => {
        const target = editorState.target;
        if (!target) return;

        const { qIndex, field, oIndex, pairIndex, itemIndex } = target;
        updateQuestionState(qIndex, q => {
            if (field === 'questionMedia') {
                return { ...q, media: null, localMediaFile: null, localCropData: null };
            } else if (field === 'mcqOptionMedia') {
                const newOptions = q.mcqData.options.map((opt, i) =>
                    i === oIndex ? { ...opt, media: null, localMediaFile: null, localCropData: null } : opt
                );
                return { ...q, mcqData: { ...q.mcqData, options: newOptions } };
            } else if (field === 'matchPromptMedia') {
                const newPairs = q.matchData.pairs.map((p, i) =>
                    i === pairIndex ? { ...p, promptMedia: null, promptLocalMediaFile: null, promptLocalCropData: null } : p
                );
                return { ...q, matchData: { ...q.matchData, pairs: newPairs } };
            } else if (field === 'matchAnswerMedia') {
                const newPairs = q.matchData.pairs.map((p, i) =>
                    i === pairIndex ? { ...p, answerMedia: null, answerLocalMediaFile: null, answerLocalCropData: null } : p
                );
                return { ...q, matchData: { ...q.matchData, pairs: newPairs } };
            } else if (field === 'categorizeItemMedia') {
                const newItems = q.categorizeData.items.map((item, i) =>
                    i === itemIndex ? { ...item, media: null, localMediaFile: null, localCropData: null } : item
                );
                return { ...q, categorizeData: { ...q.categorizeData, items: newItems } };
            } else if (field === 'reorderItemMedia') {
                const newItems = q.reorderData.items.map((item, i) =>
                    i === itemIndex ? { ...item, media: null, localMediaFile: null, localCropData: null } : item
                );
                return { ...q, reorderData: { ...q.reorderData, items: newItems } };
            } else if (field === 'visualMainMedia') {
                return { ...q, visualData: { ...q.visualData, mainMedia: null, localMainMediaFile: null, localCropData: null } };
            } else if (field === 'listeningMainMedia') {
                return { ...q, listeningData: { ...q.listeningData, mainMedia: null, localMainMediaFile: null } };
            }
            return { ...q };
        });
        setEditorState({ isOpen: false, imageSrc: null, target: null });
    };

    const handleFile = (file, cropData, target) => {
        updateQuestionState(target.qIndex, q => {
            const isImage = file.type && file.type.startsWith('image/');

            if (target.field === 'questionMedia') {
                return { ...q, localMediaFile: file, media: null, localCropData: isImage ? cropData : null };
            } else if (target.field === 'mcqOptionMedia') {
                const newOptions = q.mcqData.options.map((opt, i) =>
                    i === target.oIndex ? { ...opt, localMediaFile: file, media: null, localCropData: isImage ? cropData : null } : opt
                );
                return { ...q, mcqData: { ...q.mcqData, options: newOptions } };
            } else if (target.field === 'matchPromptMedia') {
                const newPairs = q.matchData.pairs.map((p, i) =>
                    i === target.pairIndex ? { ...p, promptLocalMediaFile: file, promptMedia: null, promptLocalCropData: isImage ? cropData : null } : p
                );
                return { ...q, matchData: { ...q.matchData, pairs: newPairs } };
            } else if (target.field === 'matchAnswerMedia') {
                const newPairs = q.matchData.pairs.map((p, i) =>
                    i === target.pairIndex ? { ...p, answerLocalMediaFile: file, answerMedia: null, answerLocalCropData: isImage ? cropData : null } : p
                );
                return { ...q, matchData: { ...q.matchData, pairs: newPairs } };
            } else if (target.field === 'categorizeItemMedia') {
                const newItems = q.categorizeData.items.map((item, i) =>
                    i === target.itemIndex ? { ...item, localMediaFile: file, media: null, localCropData: isImage ? cropData : null } : item
                );
                return { ...q, categorizeData: { ...q.categorizeData, items: newItems } };
            } else if (target.field === 'reorderItemMedia') {
                const newItems = q.reorderData.items.map((item, i) =>
                    i === target.itemIndex ? { ...item, localMediaFile: file, media: null, localCropData: isImage ? cropData : null } : item
                );
                return { ...q, reorderData: { ...q.reorderData, items: newItems } };
            } else if (target.field === 'visualMainMedia') {
                return { ...q, visualData: { ...q.visualData, localMainMediaFile: file, mainMedia: null, localCropData: isImage ? cropData : null } };
            } else if (target.field === 'listeningMainMedia') {
                return { ...q, listeningData: { ...q.listeningData, localMainMediaFile: file, mainMedia: null, localCropData: null } };
            }
            return { ...q };
        });
    };

    const handleMCQOptionChange = (qIndex, oIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, mcqData: { ...q.mcqData, options: q.mcqData.options.map((opt, i) => i === oIndex ? { ...opt, text: value } : opt) } })); };
    const handleMCQCorrectToggle = (qIndex, oIndex) => { updateQuestionState(qIndex, q => { const optionId = q.mcqData.options[oIndex].id; const newCorrectOptions = q.mcqData.correctOptions.includes(optionId) ? q.mcqData.correctOptions.filter(id => id !== optionId) : [...q.mcqData.correctOptions, optionId]; return { ...q, mcqData: { ...q.mcqData, correctOptions: newCorrectOptions } }; }); };
    const handleAddMCQOption = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, mcqData: { ...q.mcqData, options: [...q.mcqData.options, { id: Date.now(), text: '', media: null, localMediaFile: null, localCropData: null }] } })); };
    const handleRemoveMCQOption = (qIndex, oIndex) => { if (questions[qIndex].mcqData.options.length <= 2) return; updateQuestionState(qIndex, q => ({ ...q, mcqData: { ...q.mcqData, options: q.mcqData.options.filter((_, i) => i !== oIndex) } })); };
    const handleFillBlankAnswerChange = (qIndex, ansIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, fillBlankData: { ...q.fillBlankData, answers: q.fillBlankData.answers.map((ans, i) => i === ansIndex ? { ...ans, text: value } : ans) } })); };
    const handleAddFillBlankAnswer = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, fillBlankData: { ...q.fillBlankData, answers: [...q.fillBlankData.answers, { text: '' }] } })); };
    const handleRemoveFillBlankAnswer = (qIndex, ansIndex) => { if (questions[qIndex].fillBlankData.answers.length <= 1) return; updateQuestionState(qIndex, q => ({ ...q, fillBlankData: { ...q.fillBlankData, answers: q.fillBlankData.answers.filter((_, i) => i !== ansIndex) } })); };
    const handleParagraphKeywordChange = (qIndex, keyIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, paragraphData: { ...q.paragraphData, keywords: q.paragraphData.keywords.map((key, i) => i === keyIndex ? { ...key, text: value } : key) } })); };
    const handleAddParagraphKeyword = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, paragraphData: { ...q.paragraphData, keywords: [...q.paragraphData.keywords, { text: '' }] } })); };
    const handleRemoveParagraphKeyword = (qIndex, keyIndex) => { updateQuestionState(qIndex, q => ({ ...q, paragraphData: { ...q.paragraphData, keywords: q.paragraphData.keywords.filter((_, i) => i !== keyIndex) } })); };
    const handleMatchPairChange = (qIndex, pairIndex, field, value) => { updateQuestionState(qIndex, q => ({ ...q, matchData: { ...q.matchData, pairs: q.matchData.pairs.map((p, i) => i === pairIndex ? { ...p, [field]: value } : p) } })); };
    const handleAddMatchPair = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, matchData: { ...q.matchData, pairs: [...q.matchData.pairs, { id: Date.now(), prompt: '', answer: '' }] } })); };
    const handleRemoveMatchPair = (qIndex, pIndex) => { if (questions[qIndex].matchData.pairs.length <= 1) return; updateQuestionState(qIndex, q => ({ ...q, matchData: { ...q.matchData, pairs: q.matchData.pairs.filter((_, i) => i !== pIndex) } })); };
    const handleCategoryNameChange = (qIndex, catIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, categorizeData: { ...q.categorizeData, categories: q.categorizeData.categories.map((c, i) => i === catIndex ? { ...c, name: value } : c) } })); };
    const handleAddCategory = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, categorizeData: { ...q.categorizeData, categories: [...q.categorizeData.categories, { id: Date.now(), name: `Category ${q.categorizeData.categories.length + 1}` }] } })); };
    const handleRemoveCategory = (qIndex, catIndex) => { if (questions[qIndex].categorizeData.categories.length <= 1) return; updateQuestionState(qIndex, q => { const catIdToRemove = q.categorizeData.categories[catIndex].id; const newCategories = q.categorizeData.categories.filter((_, i) => i !== catIndex); const newItems = q.categorizeData.items.map(item => item.categoryId === catIdToRemove ? { ...item, categoryId: newCategories[0]?.id || null } : item); return { ...q, categorizeData: { ...q.categorizeData, categories: newCategories, items: newItems } }; }); };
    const handleCategorizeItemChange = (qIndex, itemIndex, field, value) => { updateQuestionState(qIndex, q => ({ ...q, categorizeData: { ...q.categorizeData, items: q.categorizeData.items.map((item, i) => i === itemIndex ? { ...item, [field]: value } : item) } })); };
    const handleAddCategorizeItem = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, categorizeData: { ...q.categorizeData, items: [...q.categorizeData.items, { id: Date.now(), text: '', categoryId: q.categorizeData.categories[0]?.id || null, media: null, localMediaFile: null, localCropData: null }] } })); };
    const handleRemoveCategorizeItem = (qIndex, iIndex) => { if (questions[qIndex].categorizeData.items.length <= 1) return; updateQuestionState(qIndex, q => ({ ...q, categorizeData: { ...q.categorizeData, items: q.categorizeData.items.filter((_, i) => i !== iIndex) } })); };
    const handleReorderItemChange = (qIndex, itemIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, reorderData: { ...q.reorderData, items: q.reorderData.items.map((item, i) => i === itemIndex ? { ...item, text: value } : item) } })); };
    const handleAddReorderItem = (qIndex) => { updateQuestionState(qIndex, q => ({ ...q, reorderData: { ...q.reorderData, items: [...q.reorderData.items, { id: Date.now(), text: '', media: null, localMediaFile: null, localCropData: null }] } })); };
    const handleRemoveReorderItem = (qIndex, iIndex) => { if (questions[qIndex].reorderData.items.length <= 1) return; updateQuestionState(qIndex, q => ({ ...q, reorderData: { ...q.reorderData, items: q.reorderData.items.filter((_, i) => i !== iIndex) } })); };
    const handleAddSubQuestion = (qIndex, compType, subQType) => { updateQuestionState(qIndex, q => ({ ...q, [compType]: { ...q[compType], subQuestions: [...q[compType].subQuestions, generateNewQuestion(subQType)] } })); };
    const handleRemoveSubQuestion = (qIndex, compType, subQIndex) => { updateQuestionState(qIndex, q => ({ ...q, [compType]: { ...q[compType], subQuestions: q[compType].subQuestions.filter((_, i) => i !== subQIndex) } })); };
    const handleSubQuestionChange = (qIndex, compType, subQIndex, field, value) => { updateQuestionState(qIndex, q => ({ ...q, [compType]: { ...q[compType], subQuestions: q[compType].subQuestions.map((subQ, i) => i === subQIndex ? { ...subQ, [field]: value } : subQ) } })); };
    const handleSubMCQOptionChange = (qIndex, compType, subQIndex, oIndex, value) => { updateQuestionState(qIndex, q => ({ ...q, [compType]: { ...q[compType], subQuestions: q[compType].subQuestions.map((sq, i) => i === subQIndex ? { ...sq, mcqData: { ...sq.mcqData, options: sq.mcqData.options.map((opt, optI) => optI === oIndex ? { ...opt, text: value } : opt) } } : sq) } })); };
    const handleSubMCQCorrectToggle = (qIndex, compType, subQIndex, oIndex) => { updateQuestionState(qIndex, q => { const subQ = q[compType].subQuestions[subQIndex]; const optionId = subQ.mcqData.options[oIndex].id; const newCorrectOptions = subQ.mcqData.correctOptions.includes(optionId) ? subQ.mcqData.correctOptions.filter(id => id !== optionId) : [...subQ.mcqData.correctOptions, optionId]; return { ...q, [compType]: { ...q[compType], subQuestions: q[compType].subQuestions.map((sq, i) => i === subQIndex ? { ...sq, mcqData: { ...sq.mcqData, correctOptions: newCorrectOptions } } : sq) } }; }); };


    const handlePublishQuiz = async () => {
        if (!quizTitle) { setError("Please provide a title for your quiz."); return; }
        if (!currentUser) { setError("You must be logged in to publish a quiz."); return; }

        setIsSubmitting(true);
        setError('');

        try {
            const fetchAuthParamsForUpload = async () => {
                const authApiUrl = `${import.meta.env.VITE_API_URL || ''}/api/auth`;
                const response = await fetch(authApiUrl);
                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(`Authentication server failed: ${errorBody.message || response.statusText}`);
                }
                return response.json();
            };

            let questionsToSave = JSON.parse(JSON.stringify(questions));
            const uploadPromises = [];

            const processUploads = (questionSet, questionSetToSave) => {
                questionSet.forEach((q, qIndex) => {
                    const addUpload = (file, cropData, target, prop) => {
                        uploadPromises.push(
                            fetchAuthParamsForUpload().then(authParams => {
                                return imagekit.upload({
                                    file,
                                    fileName: `quiz-media_${Date.now()}_${file.name}`,
                                    folder: '/quiz-app-media',
                                    token: authParams.token,
                                    expire: authParams.expire,
                                    signature: authParams.signature
                                });
                            }).then(result => {
                                const isImage = file.type && file.type.startsWith('image/');
                                target[prop] = { url: result.url, fileId: result.fileId, fileType: result.fileType, ...(isImage && cropData && { cropData }) };
                            }).catch(uploadError => {
                                console.error(`Error uploading file for ${prop} in question ${qIndex + 1}:`, uploadError);
                                throw new Error(`Failed to upload media for question ${qIndex + 1}: ${uploadError.message || 'Unknown upload error'}`);
                            })
                        );
                    };

                    if (q.localMediaFile) addUpload(q.localMediaFile, q.localCropData, questionSetToSave[qIndex], 'media');
                    if (q.mcqData) q.mcqData.options.forEach((opt, oIndex) => { if (opt.localMediaFile) addUpload(opt.localMediaFile, opt.localCropData, questionSetToSave[qIndex].mcqData.options[oIndex], 'media'); });
                    if (q.matchData) {
                        q.matchData.pairs.forEach((p, pIndex) => {
                            if (p.promptLocalMediaFile) addUpload(p.promptLocalMediaFile, p.promptLocalCropData, questionSetToSave[qIndex].matchData.pairs[pIndex], 'promptMedia');
                            if (p.answerLocalMediaFile) addUpload(p.answerLocalMediaFile, p.answerLocalCropData, questionSetToSave[qIndex].matchData.pairs[pIndex], 'answerMedia');
                        });
                    }
                    if (q.categorizeData) q.categorizeData.items.forEach((item, iIndex) => { if (item.localMediaFile) addUpload(item.localMediaFile, item.localCropData, questionSetToSave[qIndex].categorizeData.items[iIndex], 'media'); });
                    if (q.reorderData) q.reorderData.items.forEach((item, iIndex) => { if (item.localMediaFile) addUpload(item.localMediaFile, item.localCropData, questionSetToSave[qIndex].reorderData.items[iIndex], 'media'); });
                    if (q.visualData) { if (q.visualData.localMainMediaFile) addUpload(q.visualData.localMainMediaFile, q.visualData.localCropData, questionSetToSave[qIndex].visualData, 'mainMedia'); }
                    if (q.listeningData) { if (q.listeningData.localMainMediaFile) addUpload(q.listeningData.localMainMediaFile, null, questionSetToSave[qIndex].listeningData, 'mainMedia'); }
                });
            };

            processUploads(questions, questionsToSave);
            await Promise.all(uploadPromises);

            const cleanup = (qs) => { qs.forEach(q => { delete q.localMediaFile; delete q.localCropData; if(q.mcqData) q.mcqData.options.forEach(opt => { delete opt.localMediaFile; delete opt.localCropData; }); if(q.matchData) q.matchData.pairs.forEach(p => { delete p.promptLocalMediaFile; delete p.promptLocalCropData; delete p.answerLocalMediaFile; delete p.answerLocalCropData; }); if(q.categorizeData) q.categorizeData.items.forEach(item => { delete item.localMediaFile; delete item.localCropData; }); if(q.reorderData) q.reorderData.items.forEach(item => { delete item.localMediaFile; delete item.localCropData; }); if(q.visualData) { delete q.visualData.localMainMediaFile; delete q.visualData.localCropData; } if(q.listeningData) { delete q.listeningData.localMainMediaFile; } }); };
            cleanup(questionsToSave);

            const quizData = {
                title: quizTitle,
                description: quizDescription,
                code: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').sort(() => 0.5 - Math.random()).join('').slice(0, 6),
                quizType,
                createdBy: currentUser.uid,
                username: userDisplayName,
                createdAt: serverTimestamp(),
                active: true,
                questions: questionsToSave,
                totalPoints: questions.reduce((sum, q) => sum + (parseInt(q.points, 10) || 0), 0)
            };

            await addDoc(collection(db, "quizzes"), quizData);
            setGeneratedCode(quizData.code);
            setIsPublished(true);

        } catch (e) {
            console.error("Error publishing:", e);
            setError(`An error occurred during publishing: ${e.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    return (
        <div className="create-quiz-container">
            <input type="file" ref={hiddenFileInput} style={{ display: 'none' }} onChange={handleFileInputChange} accept="image/*,video/*,audio/*" />
            {isUploadModalOpen && (<UploadChoiceModal onChoice={handleUploadChoice} onClose={() => setIsUploadModalOpen(false)} />)}

            {editorState.isOpen && (
                <ImageEditorModal
                    imageSrc={editorState.imageSrc}
                    onEditComplete={handleImageEditComplete}
                    onClose={() => setEditorState({ isOpen: false })}
                    onDelete={handleRemoveMedia}
                />
            )}

            <div className="create-quiz-content">
                {!isPublished ? (
                    <>
                        <div className="create-quiz-header">
                            <button onClick={() => navigate('/teacher/home')} className="back-btn"><FaArrowLeft /> Dashboard</button>
                            <h2>Create New Quiz</h2>
                            <button onClick={handlePublishQuiz} className="publish-quiz-btn" disabled={isSubmitting}>
                                <FaSave /> {isSubmitting ? 'Publishing...' : 'Publish'}
                            </button>
                        </div>
                        {error && <div className="error-message"><FaTimes/> {error}</div>}
                        <div className="quiz-form-section">
                            <h3>1. Quiz Details</h3>
                            <div className="form-group">
                                <label>Quiz Title</label>
                                <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g., Chapter 5: Photosynthesis" className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} placeholder="A brief summary for your students" className="form-control" rows="3" />
                            </div>
                        </div>
                        <div className="quiz-questions-section">
                            <h3>2. Questions</h3>
                            {questions.map((q, qIndex) => (
                                <div key={q.id} className="question-card">
                                    <div className="question-header">
                                        <h4>Question {qIndex + 1}</h4>
                                        <div className="question-controls">
                                            {quizType === 'MIXED' && (
                                                <select value={q.type} onChange={(e) => handleQuestionTypeChange(qIndex, e.target.value)} className="question-type-select">
                                                    <option value="MCQ">Multiple Choice</option>
                                                    <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                                                    <option value="PARAGRAPH">Paragraph</option>
                                                    <option value="MATCH_THE_FOLLOWING">Match the Following</option>
                                                    <option value="CATEGORIZE">Categorize</option>
                                                    <option value="REORDER">Reorder</option>
                                                    <option value="VISUAL_COMPREHENSION">Visual Comprehension</option>
                                                    <option value="LISTENING_COMPREHENSION">Listening Comprehension</option>
                                                </select>
                                            )}
                                            <button onClick={() => handleRemoveQuestion(qIndex)} className="remove-item-btn" type="button" disabled={questions.length === 1}><FaTrashAlt /></button>
                                        </div>
                                    </div>
                                    <div className="question-main-content">
                                        <div className="question-text-and-media">
                                            <textarea value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="Type your question or instruction here..." className="form-control question-textarea"/>
                                            {q.type !== 'MATCH_THE_FOLLOWING' && q.type !== 'CATEGORIZE' && (
                                                <div className="main-media-controls">
                                                    {(q.media || q.localMediaFile || q.visualData?.mainMedia || q.visualData?.localMainMediaFile || q.listeningData?.mainMedia || q.listeningData?.localMainMediaFile) ?
                                                    (<MediaPreview
                                                        file={q.localMediaFile || q.media || q.visualData?.localMainMediaFile || q.visualData?.mainMedia || q.listeningData?.localMainMediaFile || q.listeningData?.mainMedia}
                                                        cropData={q.localCropData || q.media?.cropData || q.visualData?.localCropData || q.visualData?.mainMedia?.cropData}
                                                        onEdit={() => {
                                                            const target = { qIndex, field: q.type.includes('COMPREHENSION') ? (q.type === 'VISUAL_COMPREHENSION' ? 'visualMainMedia' : 'listeningMainMedia') : 'questionMedia' };
                                                            handleEditMedia(target);
                                                        }}
                                                    />) :
                                                    (<button type="button" className="add-media-btn" onClick={() => openUploadModal({ qIndex, field: q.type.includes('COMPREHENSION') ? (q.type === 'VISUAL_COMPREHENSION' ? 'visualMainMedia' : 'listeningMainMedia') : 'questionMedia' })}><FaPhotoVideo/> Add Media</button>)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="question-settings">
                                            <div className="form-group">
                                                <label>Points</label>
                                                <input type="number" value={q.points} onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value, 10) || 0)} className="form-control points-input"/>
                                            </div>
                                            <div className="form-group">
                                                <label>Time (sec)</label>
                                                <input type="number" value={q.timeLimit} onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', parseInt(e.target.value, 10) || 0)} className="form-control points-input"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="question-body">
                                        {q.type === 'MCQ' && q.mcqData && <div className="options-container"><h4>Options (Check all correct answers)</h4>{q.mcqData.options.map((opt, oIndex) => (<div key={opt.id} className="option-item"><input type="checkbox" className="form-check-input" checked={q.mcqData.correctOptions.includes(opt.id)} onChange={() => handleMCQCorrectToggle(qIndex, oIndex)} /><input type="text" value={opt.text} onChange={(e) => handleMCQOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="form-control" />{(opt.media || opt.localMediaFile) ? (<MediaPreview
                                            file={opt.localMediaFile || opt.media}
                                            cropData={opt.localCropData || opt.media?.cropData}
                                            onEdit={() => {
                                                const target = { qIndex, field: 'mcqOptionMedia', oIndex };
                                                handleEditMedia(target);
                                            }}
                                        />) : (<button type="button" className="add-media-btn-small" onClick={() => openUploadModal({ qIndex, field: 'mcqOptionMedia', oIndex })}><FaPhotoVideo/></button>)}<button className="remove-item-btn" onClick={() => handleRemoveMCQOption(qIndex, oIndex)} disabled={q.mcqData.options.length <= 2}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddMCQOption(qIndex)}><FaPlus/> Add Option</button></div>}
                                        {q.type === 'FILL_IN_THE_BLANK' && q.fillBlankData && <div className="options-container"><h4>Accepted Answers (Case Insensitive)</h4>{q.fillBlankData.answers.map((ans, ansIndex) => (<div key={ansIndex} className="option-item"><input type="text" value={ans.text} onChange={(e) => handleFillBlankAnswerChange(qIndex, ansIndex, e.target.value)} placeholder="Accepted answer" className="form-control" /><button className="remove-item-btn" onClick={() => handleRemoveFillBlankAnswer(qIndex, ansIndex)} disabled={q.fillBlankData.answers.length <= 1}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddFillBlankAnswer(qIndex)}><FaPlus/> Add Answer</button></div>}
                                        {q.type === 'PARAGRAPH' && q.paragraphData && <div className="options-container"><h4>Grading Keywords (Optional)</h4><p className="input-instruction">Provide keywords to help with grading.</p>{q.paragraphData.keywords.map((key, keyIndex) => (<div key={keyIndex} className="option-item"><input type="text" value={key.text} onChange={(e) => handleParagraphKeywordChange(qIndex, keyIndex, e.target.value)} placeholder="Keyword for grading" className="form-control" /><button className="remove-item-btn" onClick={() => handleRemoveParagraphKeyword(qIndex, keyIndex)}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddParagraphKeyword(qIndex)}><FaPlus/> Add Keyword</button></div>}
                                        {q.type === 'MATCH_THE_FOLLOWING' && q.matchData && <div className="match-following-container"><h4>Matching Pairs</h4>{q.matchData.pairs.map((pair, pIndex) => (<div key={pair.id} className="match-pair-item"><FaGripLines/><div className="match-column">{(pair.promptMedia || pair.promptLocalMediaFile) ? <MediaPreview
                                            file={pair.promptLocalMediaFile || pair.promptMedia}
                                            cropData={pair.promptLocalCropData || pair.promptMedia?.cropData}
                                            onEdit={() => {
                                                const target = { qIndex, field: 'matchPromptMedia', pairIndex: pIndex };
                                                handleEditMedia(target);
                                            }}
                                        /> : <button className="add-media-btn-small" onClick={() => openUploadModal({ qIndex, field: 'matchPromptMedia', pairIndex: pIndex})}><FaPhotoVideo/></button>}<input type="text" value={pair.prompt} onChange={e => handleMatchPairChange(qIndex, pIndex, 'prompt', e.target.value)} placeholder="Prompt" className="form-control"/></div><div className="match-column">{(pair.answerMedia || pair.answerLocalMediaFile) ? <MediaPreview
                                            file={pair.answerLocalMediaFile || pair.answerMedia}
                                            cropData={pair.answerLocalCropData || pair.answerMedia?.cropData}
                                            onEdit={() => {
                                                const target = { qIndex, field: 'matchAnswerMedia', pairIndex: pIndex };
                                                handleEditMedia(target);
                                            }}
                                        /> : <button className="add-media-btn-small" onClick={() => openUploadModal({ qIndex, field: 'matchAnswerMedia', pairIndex: pIndex})}><FaPhotoVideo/></button>}<input type="text" value={pair.answer} onChange={e => handleMatchPairChange(qIndex, pIndex, 'answer', e.target.value)} placeholder="Answer" className="form-control"/></div><button type="button" className="remove-item-btn" onClick={() => handleRemoveMatchPair(qIndex, pIndex)} disabled={q.matchData.pairs.length <= 1}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddMatchPair(qIndex)}><FaPlus/> Add Pair</button></div>}
                                        {q.type === 'CATEGORIZE' && q.categorizeData && <div className="categorize-container"><h4>Categories</h4>{q.categorizeData.categories.map((cat, cIndex) => (<div key={cat.id} className="option-item"><input type="text" value={cat.name} onChange={e => handleCategoryNameChange(qIndex, cIndex, e.target.value)} className="form-control"/><button type="button" className="remove-item-btn" onClick={() => handleRemoveCategory(qIndex, cIndex)} disabled={q.categorizeData.categories.length <= 1}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddCategory(qIndex)}><FaPlus/> Add Category</button><h4 style={{marginTop: '1.5rem'}}>Items to Categorize</h4>{q.categorizeData.items.map((item, iIndex) => (<div key={item.id} className="categorize-item-row"><div className="match-column">{(item.media || item.localMediaFile) ? <MediaPreview
                                            file={item.localMediaFile || item.media}
                                            cropData={item.localCropData || item.media?.cropData}
                                            onEdit={() => {
                                                const target = { qIndex, field: 'categorizeItemMedia', itemIndex: iIndex };
                                                handleEditMedia(target);
                                            }}
                                        /> : <button className="add-media-btn-small" onClick={() => openUploadModal({ qIndex, field: 'categorizeItemMedia', itemIndex: iIndex})}><FaPhotoVideo/></button>}<input type="text" value={item.text} onChange={e => handleCategorizeItemChange(qIndex, iIndex, 'text', e.target.value)} placeholder="Item" className="form-control"/></div><select value={item.categoryId || ''} onChange={e => handleCategorizeItemChange(qIndex, iIndex, 'categoryId', Number(e.target.value))} className="form-control category-select"><option value="" disabled>Select Category</option>{q.categorizeData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className="remove-item-btn" onClick={() => handleRemoveCategorizeItem(qIndex, iIndex)} disabled={q.categorizeData.items.length <= 1}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddCategorizeItem(qIndex)}><FaPlus/> Add Item</button></div>}
                                        {q.type === 'REORDER' && q.reorderData && <div className="reorder-container"><h4>Items to Reorder (in correct order)</h4>{q.reorderData.items.map((item, iIndex) => (<div key={item.id} className="reorder-item-row"><span className="reorder-number">{iIndex+1}.</span><div className="match-column">{(item.media || item.localMediaFile) ? <MediaPreview
                                            file={item.localMediaFile || item.media}
                                            cropData={item.localCropData || item.media?.cropData}
                                            onEdit={() => {
                                                const target = { qIndex, field: 'reorderItemMedia', itemIndex: iIndex };
                                                handleEditMedia(target);
                                            }}
                                        /> : <button className="add-media-btn-small" onClick={() => openUploadModal({ qIndex, field: 'reorderItemMedia', itemIndex: iIndex})}><FaPhotoVideo/></button>}<input type="text" value={item.text} onChange={e => handleReorderItemChange(qIndex, iIndex, e.target.value)} placeholder="Item text" className="form-control"/></div><button type="button" className="remove-item-btn" onClick={() => handleRemoveReorderItem(qIndex, iIndex)} disabled={q.reorderData.items.length <= 1}><FaTimes/></button></div>))}<button type="button" className="add-item-btn" onClick={() => handleAddReorderItem(qIndex)}><FaPlus/> Add Item</button></div>}
                                        {(q.type === 'VISUAL_COMPREHENSION' || q.type === 'LISTENING_COMPREHENSION') && <div className="comprehension-container"><h4 style={{marginTop: '1.5rem'}}>Follow-up Questions</h4>{(q.visualData?.subQuestions || q.listeningData?.subQuestions).map((subQ, subQIndex) => (<div key={subQ.id} className="sub-question-card"><div className="sub-question-header"><h5>Question {subQIndex + 1} ({subQ.type})</h5><button className="remove-item-btn" onClick={() => handleRemoveSubQuestion(qIndex, q.type === 'VISUAL_COMPREHENSION' ? 'visualData' : 'listeningData', subQIndex)}><FaTimes/></button></div><input type="text" value={subQ.questionText} onChange={(e) => handleSubQuestionChange(qIndex, q.type === 'VISUAL_COMPREHENSION' ? 'visualData' : 'listeningData', subQIndex, 'questionText', e.target.value)} className="form-control" placeholder="Sub-question text"/>{subQ.type === 'MCQ' && subQ.mcqData && <div className="options-container" style={{paddingTop: '1rem'}}>{subQ.mcqData.options.map((opt, oIndex) => (<div key={opt.id} className="option-item"><input type="checkbox" className="form-check-input" checked={subQ.mcqData.correctOptions.includes(opt.id)} onChange={() => handleSubMCQCorrectToggle(qIndex, q.type === 'VISUAL_COMPREHENSION' ? 'visualData' : 'listeningData', subQIndex, oIndex)} /><input type="text" value={opt.text} onChange={(e) => handleSubMCQOptionChange(qIndex, q.type === 'VISUAL_COMPREHENSION' ? 'visualData' : 'listeningData', subQIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="form-control" /></div>))}</div>}</div>))}<div className="sub-question-add-buttons"><button type="button" className="add-item-btn" onClick={() => handleAddSubQuestion(qIndex, q.type === 'VISUAL_COMPREHENSION' ? 'visualData' : 'listeningData', 'MCQ')}><FaPlus/> Add MCQ</button></div></div>}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddQuestion} className="add-question-btn" type="button"><FaPlus /> Add Question</button>
                        </div>
                    </>
                ) : (
                    <div className="quiz-published-section">
                        <h2>Quiz Published!</h2>
                        <p>Share this code with your students:</p>
                        <div className="quiz-code">{generatedCode}</div>
                        <button onClick={() => navigator.clipboard.writeText(generatedCode)}><FaClipboard/> Copy Code</button>
                        <button onClick={() => navigate('/teacher/home')}>Back to Dashboard</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateQuiz;
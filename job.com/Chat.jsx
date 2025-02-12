import React, { useEffect, useState, useRef } from 'react';
import { Box, Avatar, Typography, TextField, IconButton, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useWSContext } from '../../contexts/WebSocketContext';
import VizualizadorImagem from '../../components/VizualizadorImagem';

function formatarHora(data) {
  const opcoes = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return new Date(data).toLocaleString('pt-BR', opcoes).replace(',', '');
}

const suporte = {
  nome: 'Suporte',
  avatar: 'https://www.w3schools.com/howto/img_avatar2.png',
};

function Chat() {
  const { chatMessage, ws, handleClientTyping } = useWSContext();
  const [mensagens, setMensagens] = useState([]);
  const [mensagemAtual, setMensagemAtual] = useState('');
  const [suporteDigitando, setSuporteDigitando] = useState(false);
  const [imagensRecebidas, setImagensRecebidas] = useState(new Set());
  // Cria uma ref para o input de arquivo
  const fileInputRef = useRef(null);

  const addMessage = (novaMensagem) => {
    setMensagens((prevMensagens) => {
      if (novaMensagem.tipo === 'arquivo') {
        const imagemDuplicada = prevMensagens.some(
          (msg) =>
            msg.tipo === 'arquivo' &&
            msg.arquivo &&
            msg.arquivo.conteudo === novaMensagem.arquivo.conteudo
        );
        if (imagemDuplicada) return prevMensagens;

        setImagensRecebidas((prevSet) => {
          const novoSet = new Set(prevSet);
          novoSet.add(novaMensagem.arquivo.conteudo);
          return novoSet;
        });
      } else {
        const mensagemDuplicada = prevMensagens.some(
          (msg) =>
            !msg.tipo &&
            msg.texto === novaMensagem.texto &&
            msg.remetente === novaMensagem.remetente
        );
        if (mensagemDuplicada) return prevMensagens;
      }

      return [...prevMensagens, novaMensagem];
    });
  };

  useEffect(() => {
    if (!chatMessage) return;

    const { id, value, mensagemTipo, arquivoRecebido, suporte: suporteMessage } = chatMessage;

    const novaMensagem = {
      id: id || Date.now(),
      texto: value || '',
      remetente: mensagemTipo === 'SUPORTE_MENSAGEM' ? 'bot' : 'user',
      hora: new Date().toISOString(),
    };

    if (arquivoRecebido) {
      novaMensagem.tipo = 'arquivo';
      novaMensagem.arquivo = arquivoRecebido;
      novaMensagem.texto = ''; // Remove o texto, caso haja arquivo
    }

    setMensagens((prevMensagens) => {
      if (novaMensagem.tipo === 'arquivo') {
        if (novaMensagem.arquivo && novaMensagem.arquivo.nome) {
          const imagemDuplicada = prevMensagens.some(
            (msg) =>
              msg.tipo === 'arquivo' &&
              msg.arquivo &&
              msg.arquivo.nome === novaMensagem.arquivo.nome
          );
          if (imagemDuplicada) return prevMensagens;
        }
      } else {
        const mensagemDuplicada = prevMensagens.some(
          (msg) =>
            !msg.tipo &&
            msg.texto === novaMensagem.texto &&
            msg.remetente === novaMensagem.remetente
        );
        if (mensagemDuplicada) return prevMensagens;
      }

      return [...prevMensagens, novaMensagem];
    });

    if (suporteMessage?.escrevendo !== undefined) {
      setSuporteDigitando(suporteMessage.escrevendo);
    }
  }, [chatMessage]);

  // Função para enviar mensagem de texto
  const enviarMensagem = () => {
    if (mensagemAtual.trim() === '') return;

    const idMensagem = Date.now();
    const horaEnvio = new Date().toISOString();

    const novaMensagem = {
      id: idMensagem,
      texto: mensagemAtual,
      remetente: 'user',
      hora: horaEnvio,
    };

    addMessage(novaMensagem);

    ws.sendJsonMessage({
      mensagemTipo: 'CLIENTE_MENSAGEM',
      value: mensagemAtual,
      id: idMensagem,
    });

    setMensagemAtual('');
  };

  const enviarArquivo = async (file) => {
    console.log('Enviando arquivo:', file.name, 'Tamanho:', file.size);

    const reader = new FileReader();

    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];

      console.log('Arquivo convertido para base64 (parcial):', base64Data.substring(0, 100)); // Mostra apenas parte do conteúdo para evitar logs gigantescos

      ws.sendJsonMessage({
        mensagemTipo: 'CLIENTE_FILE',
        fileName: file.name,
        fileContent: base64Data,
      });

      addMessage({
        id: Date.now(),
        tipo: 'arquivo',
        arquivo: {
          nome: file.name,
          conteudo: reader.result,
        },
        remetente: 'user',
        hora: new Date().toISOString(),
      });
    };

    reader.readAsDataURL(file);
  };



  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      enviarArquivo(file);
    }
    // Em vez de modificar event.target.value diretamente, utilize a ref para limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTyping = (event) => {
    const isTyping = event.target.value.length > 0;
    handleClientTyping(isTyping);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '90vh',
        backgroundColor: '#F0F4F8',
        padding: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '750px',
          height: '750px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        {/* Chat Header */}
        <Box
          sx={{
            padding: 2,
            borderBottom: '1px solid #E0E0E0',
            backgroundColor: '#1976D2',
            color: '#FFFFFF',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          Suporte Chat
        </Box>

        {/* Exibição das mensagens */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: 2,
            backgroundColor: '#FFFFFF',
          }}
        >
          {mensagens.map((mensagem) => (
            <Box
              key={mensagem.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: mensagem.remetente === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 1.5,
              }}
            >
              {mensagem.remetente === 'bot' && (
                <Avatar src={suporte.avatar} sx={{ width: 32, height: 32, marginRight: 1 }} />
              )}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: mensagem.remetente === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {mensagem.tipo === 'arquivo' ? (
                  (() => {
                    const fileName = mensagem.arquivo.nome.toLowerCase();

                    if (fileName.endsWith('.pdf')) {
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Tooltip title="Abrir PDF">
                            <a
                              href={mensagem.arquivo.conteudo}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <PictureAsPdfIcon fontSize="large" />
                            </a>
                          </Tooltip>
                        </Box>
                      );
                    }

                    if (
                      fileName.endsWith('.mp4') ||
                      fileName.endsWith('.mov') ||
                      fileName.endsWith('.webm')
                    ) {
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <video controls style={{ maxWidth: '100%' }}>
                            <source src={mensagem.arquivo.conteudo} type="video/mp4" />
                            <track kind="captions" src="" label="captions" />
                            Seu navegador não suporta o elemento de vídeo.
                          </video>
                          <Typography variant="caption">{mensagem.arquivo.nome}</Typography>
                        </Box>
                      );
                    }

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <VizualizadorImagem arquivo={mensagem.arquivo.conteudo} />
                        <Typography variant="caption">{mensagem.arquivo.nome}</Typography>
                      </Box>
                    );
                  })()
                ) : (
                  <Box
                    sx={{
                      backgroundColor: mensagem.remetente === 'user' ? '#3B82F6' : '#000000',
                      color: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      maxWidth: '75%',
                      minWidth: '50px',
                      display: 'inline-block',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      boxShadow: 1,
                      fontSize: '14px',
                    }}
                  >
                    <Typography variant="body2" sx={{ display: 'inline' }}>
                      {mensagem.texto}
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" sx={{ color: '#666666', marginTop: '2px', display: 'block' }}>
                  {formatarHora(mensagem.hora)}
                </Typography>
              </Box>

              {mensagem.remetente === 'user' && (
                <Avatar
                  src="https://w7.pngwing.com/pngs/81/570/png-transparent-profile-logo-computer-icons-user-user-blue-heroes-logo-thumbnail.png"
                  sx={{ width: 32, height: 32, marginLeft: 1 }}
                />
              )}
            </Box>
          ))}

          {/* Mensagem de "Suporte digitando" */}
          {suporteDigitando && (
            <Box sx={{ padding: 2, textAlign: 'center', color: '#888888' }}>Suporte está digitando...</Box>
          )}
        </Box>

        {/* Campo de entrada de mensagem */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            borderTop: '1px solid #E0E0E0',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Botão para anexar arquivo */}
          <IconButton color="primary" component="label">
            <input
              type="file"
              accept="image/*,application/pdf,video/mp4,video/mov,video/webm"
              hidden
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            <AttachFileIcon />
          </IconButton>

          <TextField
            variant="outlined"
            fullWidth
            value={mensagemAtual}
            onChange={(e) => {
              setMensagemAtual(e.target.value);
              handleTyping(e);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                enviarMensagem();
              }
            }}
            placeholder="Digite sua mensagem"
            sx={{ marginLeft: 1 }}
          />
          <IconButton
            color="primary"
            onClick={enviarMensagem}
            sx={{ marginLeft: 1 }}
            disabled={!mensagemAtual.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export default Chat;

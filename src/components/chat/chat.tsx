import { FC, useEffect, useState, MouseEvent } from "react";
import { useDispatch } from "react-redux";

import HamburgerIcon from '../../assets/images/icons/hamburger.svg';
import CloserIcon from '../../assets/images/icons/close.svg';
import MSGSendIcon from '../../assets/images/icons/send.svg';
import WhatsappIcon from '../../assets/images/icons/whatsapp.svg';
import TelegramIcon from '../../assets/images/icons/tg.svg';
import StarIcon from '../../assets/images/icons/star-bg-blue.svg';
import ClockIcon from '../../assets/images/icons/clock-bg-blue.svg';
import RulesIcon from '../../assets/images/icons/rules-bg-blue.svg';
import BackIcon from '../../assets/images/icons/back-bg-blue.svg';
import TrashIcon from '../../assets/images/icons/trash.svg';
import AttachmentIcon from '../../assets/images/icons/attachment.svg';
import AttachmentImgIcon from '../../assets/images/icons/attachment-img.svg';

import { getData, postData, timestampToTime, uploadFile } from "../../services/services";

import { Attachment, SupportTicketI, UserI } from "../../interfaces";
import { setUserInfo } from "../../redux/userSlice";

import './chat.scss';
import FsLightbox from "fslightbox-react";
import { Link } from "react-router-dom";

interface ChatPropsI {
    isChatOpened: boolean
    setIsChatOpened: React.Dispatch<React.SetStateAction<boolean>>
}
 
const Chat: FC<ChatPropsI> = ({ isChatOpened, setIsChatOpened }) => {
    const baseURL = process.env.REACT_APP_DEV_SERVER_URL;

    const [message, setMessage] = useState<string>('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [ticketsList, setTicketsList] = useState<SupportTicketI[]>([]);
    const [isMenuOpened, setIsMenuOpened] = useState<boolean>(false);

    const [toggler, setToggler] = useState(false);
    const [curImages, setCurImages] = useState<Attachment[]>([]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(1);

    const dispatch = useDispatch();

    const uploadAttachments = (files: FileList) => {
        Array.from(files).forEach(file => {
            uploadFile(file).then((data) => {
                setAttachments(prevAttachments => [...prevAttachments, data.upload]);
            });
        });
    }

    const sendMessage = async () => {

        if(!window.localStorage.getItem('access_token')) {

            await postData('/user/register', {
                username: `user-${Math.random().toString(36).substring(2, 14)}`
            })
            .then(async (data) => {
                if(data.access_token) {
                    window.localStorage.setItem('access_token', data.access_token);

                    await getData('/user/me', true).then((data: UserI) => dispatch(setUserInfo({
                        ...data,
                        username: `user-${data.username}`,
                        photo: baseURL+'/uploads/'+data.photo
                    })))
                    sendMessage();
                } 
            })
        }

        await postData('/tickets/send', {
            text: message,
            attachments
        }, true)
        .then((data: SupportTicketI[]) => {
            if(ticketsList.length > 0) {
                const ticketsListRef = ticketsList;
                ticketsListRef[ticketsList.length-1] = 
                data[data.indexOf(data.filter(ticket => ticket.id === ticketsListRef[ticketsList.length-1].id)[0])];

                setTicketsList([...ticketsListRef]);
            } else {
                setTicketsList(data)
            }
            
            setAttachments([])
            setMessage('');

            setTimeout(() => {
                const chatBody = document.querySelector('.chat__body');

                chatBody!.scrollTop = (chatBody as HTMLElement).scrollHeight;
            }, 0);
        })
    }
    
    let touchStartY: number = 0;
    let touchEndY: number = 0;
    let menu: HTMLElement | null = document.querySelector('.chat__menu');

    const deleteAttachment = (i: number) => {
        const attachmentsRef = attachments;
        attachmentsRef.splice(i, 1);
        setAttachments([...attachmentsRef]);
    }

    const touchStartHandler = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
    }

    const touchMoveHandler = (e: TouchEvent) => {
        if(e.touches.length > 0) {
            touchEndY = e.touches[0].clientY;    
            let diffY: number = touchEndY - touchStartY;
            (menu as HTMLElement).style.transition = `0s`;

            if(diffY > 0) {
                (menu as HTMLElement).style.transform = `translateY(${diffY}px)`;

            }
        }
    }

    const touchEndHandler = () => {
        let diffY: number = touchEndY - touchStartY;
        (menu as HTMLElement).style.transition = `.5s`;

        if(diffY > 100) {
            setIsMenuOpened(false);
        } else {
            (menu as HTMLElement).style.transform = 'translateY(0%)';
        }
    }

    const menuCloseHandler = (e: MouseEvent) => {
        if((e.target as HTMLElement).classList.contains('chat__menu-overlay')) {
            setIsMenuOpened(false);
        }
    }

    const closeChat = () => {
        const chatElem = document.querySelector('.chat');
        chatElem?.classList.add('chat_disappeared');

        setTimeout(() => {
            setIsChatOpened(false);
        }, 400)
    }

    useEffect(() => {
        getData(`/tickets`, true)
        .then((data: SupportTicketI[]) => {
            setTicketsList(data);
        });
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout | null = null;

        const updateChat = async () => {
            await getData('/tickets', true)
                .then((data: SupportTicketI[]) => {
                    setTicketsList(data);
                })
                .finally(() => {
                    if (isChatOpened) {
                        timeout = setTimeout(updateChat, 3000);
                    }
                });
        }

        if (isChatOpened) {
            const chatBody = document.querySelector('.chat__body');
            chatBody!.scrollTop = chatBody!.scrollHeight;

            if(window.localStorage.getItem('access_token')) {
                updateChat();
            } else {
                if (timeout) {
                    clearTimeout(timeout);
                }
            }
        }
        
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [isChatOpened]);

    return (
        <div className="chat-wrapper">
            <FsLightbox
                toggler={toggler}
                slide={activeSlideIndex}
                key={Math.random()}
                sources={[...curImages.map(attach => <img key={attach.id} src={baseURL + '/uploads/' + attach.file} alt="Не удалось загрузить изображение"/>)]}
            />
            {
                isChatOpened ? 
                <div className="chat">
                    <header className="chat__header">
                        <div onClick={() => {
                            setIsMenuOpened(true);
                        }} className="chat__hamburger">
                            <img src={HamburgerIcon} alt="меню" />
                        </div>
                        <h5 className="chat__title">Поддержка</h5>
                        <img onClick={() => closeChat()} src={CloserIcon} alt="закрыть" className="chat__closer"/>
                    </header>
                    <div className="chat__body">
                        {
                            ticketsList.length ? ticketsList.map((ticket, i) => {
                                return ticket.messages?.map(({id, role, text, attachments, created_at}) => {
                                    return  (
                                        <div 
                                            key={id} 
                                            className={
                                                `
                                                    chat__message 
                                                    ${role === 'admin' ? '' : 'chat__message_mine'} 
                                                `
                                            }
                                        >
                                            {
                                                text.length ?
                                                   ( 
                                                        <p className={`chat__message-text ${attachments.length > 0 ? 'chat__message-text_squared' : ''}`}>
                                                            {text}
                                                        </p>
                                                    ) : null
                                            }
                                            
                                            {
                                                attachments.length ? (attachments as Attachment[]).map((attach, index) => {
                                                    return <img 
                                                        key={attach.id} 
                                                        onClick={() => {
                                                            setCurImages(attachments as Attachment[])
                                                            setToggler(!toggler)
                                                            setActiveSlideIndex(index+1)
                                                        }}
                                                        src={baseURL + '/uploads/' + attach.file}
                                                        alt="не удалось загрузить изображение" 
                                                        className="chat__message-attachment"
                                                    />
                                                }) : null
                                            }
                                            <span className="chat__message-time">{timestampToTime(created_at)}</span>
                                        </div>
                                    ) 
                                })
                                
                            }) : null
                        }
                    </div>
                    <form className="chat__footer">
                        <div className="chat__footer-attachments">
                            {
                                attachments.length ? attachments.map((attach, i) => {
                                    return (
                                        <div className="chat__footer-attachment-wrapper">
                                            <a key={attach} target="blank" href={baseURL + '/uploads/' + attach} className="chat__footer-attachment">
                                                <span className="chat__footer-attachment-icon">
                                                    <img src={AttachmentImgIcon} alt={attach} />
                                                </span>
                                                {attach}
                                            </a>
                                            <span onClick={() => deleteAttachment(i)} className="chat__footer-attachment-trash chat__footer-attachment-icon">
                                                <img src={TrashIcon} alt="удалить" />
                                            </span>
                                        </div>
                                    )
                                }) : null
                            }
                        </div>
                        <input 
                            onInput={e => setMessage((e.target as HTMLInputElement).value)} 
                            type="text" 
                            className="chat__input" 
                            placeholder="Ваше сообщение..."
                            value={message}
                        />
                        <label htmlFor="chat__attachment-file" className="chat__attachment">
                            <input 
                                onInput={(e) => uploadAttachments((e.target as HTMLInputElement).files as FileList)} 
                                multiple
                                type="file" 
                                accept="image/png, image/jpeg" 
                                id="chat__attachment-file" 
                                className="chat__attachment-file" 
                            />
                            <img src={AttachmentIcon} 
                                alt="прикрепите файл" 
                                className="chat__attachment-icon"
                            />
                        </label>
                        {
                            (message.length > 0 || attachments.length > 0) &&
                            <button onClick={e => {
                                e.preventDefault();
                                sendMessage();
                            }} className="chat__sender">
                                <img src={MSGSendIcon} alt="отправить"/>
                            </button>
                        }
                    </form>
                    <div 
                        className={`chat__menu-overlay ${isMenuOpened ? 'chat__menu-overlay_opened' : ''}`}
                        onClick={(e: MouseEvent) => menuCloseHandler(e)}
                        onTouchStart={(e: any) => touchStartHandler(e)} 
                        onTouchMove={(e: any) => touchMoveHandler(e)}
                        onTouchEnd={() => touchEndHandler()} 
                    >
                        <nav style={{transform: `translateY(${isMenuOpened ? '0%' : '100%'})`}} className="chat__menu">
                            <div className="chat__menu-header">
                                <span className="chat__menu-closer"></span>
                            </div>
                            <div className="chat__menu-body">
                                <ul className="chat__menu-list list">
                                    <li className="chat__menu-item">
                                        <a href="https://wa.me/905344582667" className="chat__menu-link">
                                            <img src={WhatsappIcon} alt="WhatApp" className="chat__menu-icon" />
                                            Поддержка в WhatsApp
                                        </a>
                                    </li>
                                    <li className="chat__menu-item">
                                        <a href="https://t.me/LoftSoft" className="chat__menu-link">
                                            <img src={TelegramIcon} alt="Telegram" className="chat__menu-icon" />
                                            Поддержка в Телеграм
                                        </a>
                                    </li>
                                </ul>
                                <ul className="chat__menu-list chat__menu-list_condensed list">
                                    <li className="chat__menu-item">
                                        <a href="/" className="chat__menu-link">
                                            <img src={StarIcon} alt="Отзывы" className="chat__menu-icon" />
                                            Отзывы клиентов
                                        </a>
                                    </li>
                                    <li className="chat__menu-item">
                                        <a href="/" className="chat__menu-link">
                                            <img src={ClockIcon} alt="График работы поддержки" className="chat__menu-icon" />
                                            График работы поддержки
                                        </a>
                                    </li>
                                    <li className="chat__menu-item">
                                            <Link to="/terms" className="chat__menu-link">
                                                <img src={RulesIcon} alt="Правила магазина" className="chat__menu-icon" />
                                                Правила магазина
                                            </Link>
                                    </li>
                                    <li className="chat__menu-item">
                                        <Link to="/terms" className="chat__menu-link">
                                            <img src={BackIcon} alt="Правила возврата" className="chat__menu-icon" />
                                            Правила возврата
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                     </div>
                </div> : null
            }
             <div className="chat-opener" onClick={() => setIsChatOpened(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 48 48" fill="none">
                    <path d="M16.2501 20.1249C16.2501 19.6111 16.4542 19.1182 16.8176 18.7549C17.1809 18.3915 17.6738 18.1874 18.1876 18.1874H29.8126C30.3265 18.1874 30.8193 18.3915 31.1826 18.7549C31.546 19.1182 31.7501 19.6111 31.7501 20.1249C31.7501 20.6388 31.546 21.1316 31.1826 21.4949C30.8193 21.8583 30.3265 22.0624 29.8126 22.0624H18.1876C17.6738 22.0624 17.1809 21.8583 16.8176 21.4949C16.4542 21.1316 16.2501 20.6388 16.2501 20.1249ZM18.1876 25.9374C17.6738 25.9374 17.1809 26.1415 16.8176 26.5049C16.4542 26.8682 16.2501 27.3611 16.2501 27.8749C16.2501 28.3888 16.4542 28.8816 16.8176 29.2449C17.1809 29.6083 17.6738 29.8124 18.1876 29.8124H25.9376C26.4515 29.8124 26.9443 29.6083 27.3076 29.2449C27.671 28.8816 27.8751 28.3888 27.8751 27.8749C27.8751 27.3611 27.671 26.8682 27.3076 26.5049C26.9443 26.1415 26.4515 25.9374 25.9376 25.9374H18.1876ZM0.750117 23.9999C0.751106 18.8812 2.44126 13.9059 5.55841 9.84581C8.67555 5.7857 13.0454 2.86775 17.9901 1.5446C22.9349 0.221451 28.178 0.567073 32.9063 2.52785C37.6346 4.48862 41.5836 7.95495 44.1408 12.3891C46.698 16.8233 47.7205 21.9774 47.0495 27.0519C46.3786 32.1264 44.0518 36.8377 40.4301 40.4549C36.8083 44.0721 32.0941 46.393 27.0188 47.0576C21.9434 47.7222 16.7906 46.6933 12.3596 44.1305L3.29987 47.153C2.96515 47.2648 2.60628 47.283 2.26197 47.2057C1.91765 47.1284 1.60099 46.9586 1.34614 46.7145C1.09129 46.4704 0.907944 46.1614 0.81588 45.8207C0.723817 45.4801 0.726535 45.1208 0.823742 44.7815L3.58274 35.1289C1.71893 31.716 0.744757 27.8886 0.750117 23.9999ZM24.0001 4.62491C20.5792 4.6247 17.2192 5.53023 14.2617 7.24947C11.3042 8.96871 8.85456 11.4404 7.16189 14.4132C5.46922 17.386 4.59382 20.7539 4.62469 24.1747C4.65555 27.5955 5.59158 30.9471 7.33762 33.8889C7.47195 34.1162 7.55844 34.3685 7.59175 34.6303C7.62507 34.8922 7.60452 35.1581 7.53137 35.4118L5.55899 42.3093L11.9837 40.1703C12.2566 40.0792 12.5463 40.0501 12.8318 40.0849C13.1174 40.1198 13.3916 40.2178 13.6345 40.3718C16.1737 41.9787 19.0518 42.973 22.0414 43.2761C25.031 43.5792 28.0502 43.1827 30.8602 42.1181C33.6702 41.0534 36.194 39.3498 38.2322 37.1418C40.2705 34.9337 41.7672 32.2819 42.604 29.3959C43.4409 26.5098 43.595 23.4687 43.0542 20.5128C42.5134 17.5569 41.2924 14.7674 39.4879 12.3646C37.6833 9.96187 35.3446 8.01179 32.6566 6.66852C29.9686 5.32525 27.0051 4.62561 24.0001 4.62491Z"/>
                </svg>
            </div>
        </div>
    );
}
 
export default Chat;
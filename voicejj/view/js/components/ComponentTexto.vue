<template>
    <div id="chat-frame-box">
        <div class="status status-done">
            <!-- QUANDO O TEMPO ACABAR QUEM RECEBE -->
             <div v-if="finished" class="mb-4">
                <script>
                    alert('Chat finalizado.')
                </script>
            </div>
        </div>
        <!-- # some status # -->

        <div class="talking-area">
            <div v-for="(item, index) in messages" :key="index" :class="item.fromUserId == sender.id ? 'msg agent-me' : 'msg agent-notme'">
                <div class="text">
                    <span class="name"> {{item.fromUserId == sender.id ? sender.name : receiver.name }} </span>
                    {{ item.message }}
                </div>
            </div>
        </div>
        <div class="panel-text">
            <p class="typing" v-if="typing">{{ receiver.name }} está digitando...</p>
            <textarea v-model="message" @keyup.enter="sendMessage" @keypress="onTyping" @keyup.delete="stopTyping" id="message" placeholder="Enviar mensagem..." ></textarea>
            <button @click="sendMessage">Enviar Mensagem</button>
        </div>
    </div>
</template>

<script>
export default {
    props: ['id', 'to'],
    data () {
        return {
            message: '',
            messages: [],
            typing: false,
            finished: {status: false},
            socket: io('http://vps13171.publiccloud.com.br:9001')
        }
    },
    created() {
    },
    mounted() {
        //Listen for messages
        this.socket.on('isconnected', this.startedConn);
        this.socket.on('isdiconnected', (data) => console.log(data));
        this.socket.on('receiveMessage', this.receiveMessage);
        this.socket.on('istyping', this.someoneIsTyping);
        this.socket.on('notyping', this.finishIsTyping);
        this.socket.on('finishing', (data) => this.finishingChat(data))

        // if is visitor, waits for consultant accept to join ->
        if(this.sender.role == 3) {
            this.socket.on('consultantAccept', (data) => {
                console.log('consultor respondeu: ', data);
                if(data.accepted) {
                    this.loader.active = false;
                    desistir = false;
                    this.MudaStatus(false);
                } else {
                    this.loader.active = true;
                    this.loader.refuse = true;
                    this.loader.timeout = true;
                    $(window).unbind('beforeunload');
                    $(window).unbind('unload');
                    axios.post('../ignorado', {status: 8, id: this.sender.chat});
                    desistir = false;
                }
            });
        }
        setTimeout(() => {
            if(this.loader.active){
                this.loader.timeout = false;
                //status de timeout
                this.finishTimeOut();
            }
        }, 300000);

        if(this.sender.role == '2')
        {
            this.socket.emit('startTime', {id:this.receiver.id, fromId: this.sender.id});
        }

        //If try close the window or head back
        this.unloadStartEvent();
    },
    destroyed() {
        this.socket.emit('disconnect', this.sender.id)
    },
    methods: {
        sendMessage() {
            if (this.message.trim().length > 0) {
                let messagePackage = this.createMsgObj(this.message);
                this.socket.emit('sendMessage', messagePackage);
                this.socket.emit("typing", {toUserId: this.receiver.id, name: this.receiver.name, typing:false });
                this.socket.emit('response', {toUserId: this.receiver.id});
                this.messages.push(messagePackage);
                this.storeMessage();
                this.message = "";
                this.scrollToBottom();
            }else{
                alert("Digite algo antes de enviar :)");
            }
        },
        whoiam(role) {
            return role == 2 ? 'consultor' : 'visitante';
        },
        receiveMessage(msg) {
            this.messages.push(msg);
            this.scrollToBottom();
        },
        giveUp(){
            $(window).unbind('beforeunload');
            $(window).unbind('unload');
            axios.post('../ignorado', {status: 5, id: this.sender.chat});
            var start = new Date().getTime();
            var end = start;
            while(end < start + 1000) {
                end = new Date().getTime();
            }
        },
        onTyping() {
            if(this.message.length == 1 || (this.message.length%100 == 0 && this.message.length > 0))
            {
                this.socket.emit("typing", {toUserId: this.receiver.id, name: this.receiver.name, typing:true });
                this.socket.emit('response', {toUserId: this.receiver.id});
            }
        },
        stopTyping() {
            if(this.message.length == 0)
            {
                this.socket.emit("typing", {toUserId: this.receiver.id, name: this.receiver.name, typing:false });
                this.socket.emit('response', {toUserId: this.receiver.id});
            }
        },
        someoneIsTyping(data) {
            this.typing = true;
        },
        finishIsTyping(data) {
            this.typing = false;
        },
        createMsgObj() {
            return {
                fromUserId: this.sender.id,
                toUserId: this.receiver.id,
                message: this.message
            }
        },
        scrollToBottom() {
            setTimeout(function() {
                document.querySelector('.talking-area').scrollTop = document.querySelector('.talking-area').scrollHeight
            },300)
        },
        startedConn(data) {
            //consultor
            if(data.role == 2) {
                this.loader.active = false;
            }
            console.log('INIT: ',data.msg)
        },
        ranOutTime() {
            this.loader.active = true;
            this.loader.type= "done";
        },
        unloadStartEvent() {
        },
        unbindUnloadEvent() {
            window.removeEventListener("beforeunload", function(e) {
                console.log('unload foi removido.')
            }, true);
            window.removeEventListener("unload", function(e) {
                console.log('unload foi removido.')
            }, true);
        },
        storeMessage(){
            let consultor;
            if(this.sender.role == 2){
                consultor = 1;
                axios.post('../../mensagem', {atendimento: this.sender.chat, mensagem: this.message, msgpor: consultor})
            }
            else{
                consultor = 0;
                axios.post('../mensagem', {atendimento: this.sender.chat, mensagem: this.message, msgpor: consultor})
            }
        },
        finishingChat(data){
            $(window).unbind('beforeunload');
            $(window).unbind('unload');
            // status 1: Creditos insuficientes;
            // status 2: Timeout do atendente;
            // status 3: finalizado pelo atendente;
            // status 4: finalizado pelo cliente;
            // status 5: Cliente desistiu de esperar o atendente;
            // status 6: Não teve eventos causados pelo atendente por 2 minutos;
            // status 7: Não teve eventos causados pelo cliente por 2 minutos;
            // status 8: Chamada ignorada pelo atendente

            console.log('finishingChat data: ', data)

            //Creditos Insuficientes
            if(data.status == 1) {
                if(this.sender.role == 2){
                    this.finishedByTime.status = true;
                    this.finishedByTime.role = 2;
                    this.finishAtendente(data);
                }
                else {
                    this.finishedByTime.status = true;
                    this.finishedByTime.role = 3;
                    this.finishVisitante(data);
                }
            }
            //Finalizado pelo atendente ou visitante
            if(data.status == 3 || data.status == 4) {
                console.log('Finalizado pelo atendente ou visitante');
                this.finishedByGiveUp.status = true;
                this.finishedByGiveUp.role = data.role;
                if(this.sender.role == 2){
                    this.finishAtendente(data);
                }
                else {
                    this.finishVisitante(data);
                }
            }
            //Finalizado por timeout, atendente ou visitante
            if(data.status == 6 || data.status == 7) {
                console.log('Finalizado por timeout, atendente ou visitante');
                this.finishedByTimeout.status = true;
                this.finishedByTimeout.role = data.role;
                if(this.sender.role == 2){
                    this.finishAtendente(data);
                }
                else {
                    this.finishVisitante(data);
                }
            }
            //Chamada ignorada pelo atendente
            if(data.status == 2 && this.sender.role == 2) {
                console.log('caiuu no 2');
                this.loader.type = 'waiting';
                this.loader.active = true;
                this.consultantIgnore = true;
            }
            this.MudaStatus(true);

        },
        finishAtendente(data) {
            axios.post('../../finalizar', {status: data.status, id: this.sender.chat, time: timer, restante: restantes})
            .then(() => {
                this.loader.active = true;
                this.loader.type = 'done';
            })
            this.MudaStatus(true);

            //window.location.href= '../atendimento/visualizar/'+this.sender.chat;
        },
        finishVisitante(data) {
            this.loader.active = true;
            this.loader.type = 'done';
            this.finishedByTime = true;
            axios.post('../finalizar', {status: data.status, id: this.sender.chat, time: timer, restante: restantes})
            .then(() => {
                $('#avaliation-modal').modal('show');

            }).catch(()=> {
                $('#avaliation-modal').modal('show');
            })
            this.MudaStatus(true);

        },
        finishTimeOut()
        {
            $(window).unbind('beforeunload');
            $(window).unbind('unload');
            //qual status de timeout?
            var statuss = 2;
            var chat = this.sender.chat;
            axios.post('../finalizar', {status: statuss, id: chat, time: timer, restante: restantes})
                .then((data) => {
                    console.log('Finalizado com sucesso!');
                    this.socket.emit('finishChat', {toUserId: this.receiver.id, status: statuss, role: this.sender.role, type: 0});
                    $('#avaliation-modal').modal('show');
                })
                .catch((e) => {
                    console.log('Erro ao finalizar: ', e)
                    this.socket.emit('finishChat', {toUserId: this.receiver.id, status: statuss, role: this.sender.role, type: 0});
                    $('#avaliation-modal').modal('show')
            });
            this.MudaStatus(true);

        },
        MudaStatus(statusAtual)
        {
            var onlines = [];
            axios.get('/getOnlines').then((data) =>{
                onlines = data.data.onlines;
            });

            this.socket.emit("statusConsultor",{
                id_consultor: (this.sender.role == 2) ? this.sender.id : this.receiver.id,
                status: statusAtual,
                type: 1,
                online: onlines
            });

        }
    }
}
</script>

<style scoped>
    .typing {
        font-family: 'Open Sans', sans-serif;
        font-size: 14px;
        color: #c7bdbd;
        margin-bottom: 10px;
    }
</style>

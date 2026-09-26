import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const FEATURES = [
  ['search','Search messages','Search the current chat','search'],
  ['photos','Photos','Show shared photos','images-outline'],
  ['videos','Videos','Show shared videos','videocam-outline'],
  ['files','Files','Show documents and files','document-text-outline'],
  ['voice','Voice','Show voice notes','mic-outline'],
  ['locations','Locations','Show shared locations','location-outline'],
  ['contacts','Contacts','Show shared contacts','person-outline'],
  ['polls','Polls','Show polls','stats-chart-outline'],
  ['links','Links','Show messages containing links','link-outline'],
  ['reactions','Reacted','Show messages with reactions','heart-outline'],
  ['starred','Starred','Show starred messages','star-outline'],
  ['pinned','Pinned','Show pinned messages','pin-outline'],
  ['replies','Replies','Show replied messages','return-up-forward-outline'],
  ['forwarded','Forwarded','Show forwarded messages','arrow-redo-outline'],
  ['edited','Edited','Show edited messages','create-outline'],
  ['view_once','View once','Show view-once media','eye-outline'],
  ['unread','Unread','Show unread messages','mail-unread-outline'],
  ['deleted','Deleted','Show deleted messages','trash-outline'],
  ['media','All media','Show every media message','albums-outline'],
];

export default function ChatFeatureHub({ visible, onClose, onFilter, activeFilter='all', onSearch, onMute, muted=false, onTimer, onMarkRead, onExport, onJumpLatest, onFocusComposer, onSettings, onMegaFeatures }) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? FEATURES.filter(item => (item[1]+' '+item[2]).toLowerCase().includes(q)) : FEATURES;
  }, [search]);

  const choose = id => {
    if (id === 'search') {
      onSearch?.(search.trim());
      return;
    }
    onFilter?.(id);
    onClose?.();
  };

  const utility = [
    ['mute', muted ? 'Unmute chat' : 'Mute chat', muted ? 'volume-high-outline' : 'volume-mute-outline', () => onMute?.(!muted)],
    ['timer1','1 day disappearing', 'timer-outline', () => onTimer?.(86400)],
    ['timer7','7 day disappearing', 'timer-outline', () => onTimer?.(604800)],
    ['timeroff','Turn disappearing off', 'timer-outline', () => onTimer?.(0)],
    ['read','Mark all as read', 'checkmark-done-outline', onMarkRead],
    ['latest','Jump to latest', 'arrow-down-circle-outline', onJumpLatest],
    ['export','Share/export chat', 'share-social-outline', onExport],
    ['composer','Focus composer', 'chatbubble-ellipses-outline', onFocusComposer],
    ['settings','Chat settings', 'settings-outline', onSettings],
  ];

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet,{backgroundColor:theme.surfaceStrong,borderColor:theme.border}]}>
          <TouchableOpacity onPress={onMegaFeatures} style={[s.megaButton,{backgroundColor:'rgba(8,126,255,.10)',borderColor:'rgba(8,126,255,.28)'}]}><View style={s.megaIcon}><Ionicons name="flash" size={18} color={theme.blue}/></View><View style={{flex:1}}><Text style={[s.megaTitle,{color:theme.text}]}>Open 100 new features</Text><Text style={[s.megaSub,{color:theme.sub}]}>Power tools, composer actions, navigation and productivity</Text></View><Ionicons name="chevron-forward" size={18} color={theme.blue}/></TouchableOpacity>

          <View style={s.header}>
            <View>
              <Text style={[s.title,{color:theme.text}]}>Chat Toolkit</Text>
              <Text style={[s.sub,{color:theme.sub}]}>Search, filter and control this chat</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={23} color={theme.text}/></TouchableOpacity>
          </View>

          <View style={[s.searchBox,{backgroundColor:theme.input,borderColor:theme.border}]}>
            <Ionicons name="search-outline" size={18} color={theme.sub}/>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search toolkit"
              placeholderTextColor={theme.sub}
              style={[s.searchInput,{color:theme.text}]}
              returnKeyType="search"
              onSubmitEditing={() => onSearch?.(search.trim())}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            <Text style={[s.section,{color:theme.sub}]}>MESSAGE TOOLS</Text>
            <View style={s.grid}>
              {filtered.map(([id,label,desc,icon]) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => choose(id)}
                  style={[s.card,{backgroundColor:activeFilter===id?'rgba(8,126,255,.12)':theme.input,borderColor:activeFilter===id?theme.blue:theme.border}]}
                >
                  <View style={[s.icon,{backgroundColor:activeFilter===id?'rgba(8,126,255,.18)':'rgba(128,128,128,.10)'}]}>
                    <Ionicons name={icon} size={19} color={activeFilter===id?theme.blue:theme.text}/>
                  </View>
                  <Text style={[s.cardTitle,{color:theme.text}]} numberOfLines={1}>{label}</Text>
                  <Text style={[s.cardDesc,{color:theme.sub}]} numberOfLines={2}>{desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.section,{color:theme.sub}]}>CHAT CONTROLS</Text>
            <View style={s.utilityList}>
              {utility.map(([id,label,icon,fn]) => (
                <TouchableOpacity key={id} onPress={() => { fn?.(); if(id!=='composer') onClose?.(); }} style={[s.utility,{borderColor:theme.border}]}>
                  <Ionicons name={icon} size={20} color={theme.blue}/>
                  <Text style={[s.utilityText,{color:theme.text}]}>{label}</Text>
                  <Ionicons name="chevron-forward" size={17} color={theme.sub}/>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.48)',justifyContent:'flex-end'},
  sheet:{maxHeight:'88%',borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:1,padding:16},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  title:{fontSize:20,fontWeight:'900'},sub:{fontSize:11,fontWeight:'700',marginTop:2},
  close:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(128,128,128,.10)'},
  searchBox:{minHeight:44,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  searchInput:{flex:1,fontSize:14,paddingVertical:9,marginLeft:7},
  content:{paddingBottom:20},
  section:{fontSize:10,fontWeight:'900',letterSpacing:1,marginTop:16,marginBottom:9},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  card:{width:'31.8%',minHeight:106,borderWidth:1,borderRadius:17,padding:10},
  icon:{width:34,height:34,borderRadius:11,alignItems:'center',justifyContent:'center',marginBottom:7},
  cardTitle:{fontSize:12,fontWeight:'900'},cardDesc:{fontSize:9,lineHeight:13,marginTop:3,fontWeight:'600'},
  utilityList:{borderTopWidth:1},
  utility:{minHeight:52,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:3},
  utilityText:{flex:1,fontSize:14,fontWeight:'800',marginLeft:11},
  megaButton:{flexDirection:'row',alignItems:'center',minHeight:58,borderWidth:1,borderRadius:17,paddingHorizontal:11,marginBottom:4},
  megaIcon:{width:34,height:34,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,126,255,.16)',marginRight:10},
  megaTitle:{fontSize:13,fontWeight:'900'},megaSub:{fontSize:9,fontWeight:'600',marginTop:2}
});

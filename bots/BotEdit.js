// bots/BotEdit.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth } from '../firebaseConfig';

import {
  getBot,
  updateValidatedBot,
  deleteBot,
} from '../api/BotAPI';

import {
  validateBotContent,
} from '../security/ContentValidator';

import {
  validateBot,
  normalizeBotConfig,
} from '../security/BotValidator';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_WELCOME_LENGTH = 2000;

const VISIBILITY_OPTIONS = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can access this bot.',
  },
  {
    id: 'public',
    label: 'Public',
    description: 'Users can discover and use this bot.',
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

function getBotIdFromProps(props) {
  return (
    props?.botId ||
    props?.route?.params?.botId ||
    props?.route?.params?.bot?.id ||
    null
  );
}

function normalizeText(value = '', maxLength) {
  return String(value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function getErrorMessage(error) {
  if (!error) {
    return 'Something went wrong.';
  }

  if (typeof error === 'string') {
    return error;
  }

  return (
    error?.message ||
    error?.error ||
    'Something went wrong.'
  );
}

function getInitial(name = '') {
  return (
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase() || 'B'
  );
}

/* -------------------------------------------------------------------------- */
/* BotEdit                                                                    */
/* -------------------------------------------------------------------------- */

export default function BotEdit({
  navigation,
  route,
  botId: directBotId,
  bot: directBot,
  onSaved,
  onDeleted,
  onOpenCommands,
}) {
  const botId =
    directBotId ||
    getBotIdFromProps({
      route,
    });

  const initialBot =
    directBot ||
    route?.params?.bot ||
    null;

  const [bot, setBot] =
    useState(initialBot);

  const [loading, setLoading] =
    useState(!initialBot);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [name, setName] =
    useState(initialBot?.name || '');

  const [description, setDescription] =
    useState(
      initialBot?.description || ''
    );

  const [welcomeMessage, setWelcomeMessage] =
    useState(
      initialBot?.welcomeMessage || ''
    );

  const [visibility, setVisibility] =
    useState(
      initialBot?.visibility || 'private'
    );

  const [enabled, setEnabled] =
    useState(
      initialBot?.enabled !== false
    );

  const [error, setError] =
    useState('');

  const currentUserId =
    getCurrentUserId();

  /* ------------------------------------------------------------------------ */
  /* Load bot                                                                 */
  /* ------------------------------------------------------------------------ */

  const loadBot = useCallback(
    async () => {
      if (!botId) {
        setError(
          'Bot ID is missing.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const loadedBot =
          await getBot(botId);

        if (!loadedBot) {
          throw new Error(
            'Bot was not found.'
          );
        }

        setBot(loadedBot);

        setName(
          loadedBot.name || ''
        );

        setDescription(
          loadedBot.description || ''
        );

        setWelcomeMessage(
          loadedBot.welcomeMessage || ''
        );

        setVisibility(
          loadedBot.visibility ||
            'private'
        );

        setEnabled(
          loadedBot.enabled !== false
        );
      } catch (loadError) {
        console.error(
          '[BotEdit] Failed to load bot:',
          loadError
        );

        setError(
          getErrorMessage(loadError)
        );
      } finally {
        setLoading(false);
      }
    },
    [botId]
  );

  useEffect(() => {
    if (!initialBot) {
      loadBot();
    }
  }, [
    initialBot,
    loadBot,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Ownership                                                                */
  /* ------------------------------------------------------------------------ */

  const isOwner = useMemo(() => {
    if (!bot || !currentUserId) {
      return false;
    }

    return (
      bot.ownerId === currentUserId ||
      bot.creatorId === currentUserId
    );
  }, [
    bot,
    currentUserId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Form validation                                                          */
  /* ------------------------------------------------------------------------ */

  const validateForm =
    useCallback(() => {
      if (!bot) {
        return [
          'Bot data is unavailable.',
        ];
      }

      const errors = [];

      const contentResult =
        validateBotContent({
          ...bot,
          name,
          description,
          welcomeMessage,
          visibility,
          enabled,
        });

      if (!contentResult.valid) {
        errors.push(
          ...contentResult.errors
        );
      }

      const botResult =
        validateBot({
          ...bot,
          name,
          description,
          welcomeMessage,
          visibility,
          enabled,
        });

      if (!botResult.valid) {
        errors.push(
          ...botResult.errors
        );
      }

      return [
        ...new Set(errors),
      ];
    }, [
      bot,
      description,
      enabled,
      name,
      visibility,
      welcomeMessage,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Save                                                                     */
  /* ------------------------------------------------------------------------ */

  const handleSave =
    useCallback(async () => {
      setError('');

      if (!currentUserId) {
        const message =
          'You must be signed in to edit a bot.';

        setError(message);
        Alert.alert(
          'Authentication Required',
          message
        );

        return;
      }

      if (!isOwner) {
        const message =
          'You do not have permission to edit this bot.';

        setError(message);
        Alert.alert(
          'Permission Denied',
          message
        );

        return;
      }

      const errors =
        validateForm();

      if (errors.length > 0) {
        const message =
          errors.join('\n');

        setError(message);

        Alert.alert(
          'Check Bot',
          message
        );

        return;
      }

      setSaving(true);

      try {
        const updatedInput =
          normalizeBotConfig({
            ...bot,

            id: bot.id || botId,

            name: name.trim(),

            description:
              description.trim(),

            welcomeMessage:
              welcomeMessage.trim(),

            visibility,

            enabled,

            ownerId:
              bot.ownerId ||
              currentUserId,

            creatorId:
              bot.creatorId ||
              currentUserId,
          });

        const updated =
          await updateValidatedBot(
            bot.id || botId,
            updatedInput
          );

        if (!updated) {
          throw new Error(
            'Bot could not be updated.'
          );
        }

        setBot(updated);

        setName(
          updated.name || name
        );

        setDescription(
          updated.description ||
            description
        );

        setWelcomeMessage(
          updated.welcomeMessage ||
            welcomeMessage
        );

        setVisibility(
          updated.visibility ||
            visibility
        );

        setEnabled(
          updated.enabled !== false
        );

        if (onSaved) {
          onSaved(updated);
        }

        Alert.alert(
          'Saved',
          'Your bot has been updated successfully.'
        );
      } catch (saveError) {
        console.error(
          '[BotEdit] Failed to save bot:',
          saveError
        );

        const message =
          getErrorMessage(saveError);

        setError(message);

        Alert.alert(
          'Save Failed',
          message
        );
      } finally {
        setSaving(false);
      }
    }, [
      bot,
      botId,
      currentUserId,
      description,
      isOwner,
      name,
      onSaved,
      validateForm,
      visibility,
      welcomeMessage,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Delete                                                                   */
  /* ------------------------------------------------------------------------ */

  const performDelete =
    useCallback(async () => {
      if (!botId) {
        return;
      }

      setDeleting(true);
      setError('');

      try {
        await deleteBot(
          botId,
          currentUserId
        );

        if (onDeleted) {
          onDeleted(bot);
          return;
        }

        if (navigation?.goBack) {
          navigation.goBack();
        }
      } catch (deleteError) {
        console.error(
          '[BotEdit] Failed to delete bot:',
          deleteError
        );

        const message =
          getErrorMessage(
            deleteError
          );

        setError(message);

        Alert.alert(
          'Delete Failed',
          message
        );
      } finally {
        setDeleting(false);
      }
    }, [
      bot,
      botId,
      currentUserId,
      navigation,
      onDeleted,
    ]);

  const handleDelete =
    useCallback(() => {
      if (!isOwner) {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to delete this bot.'
        );

        return;
      }

      Alert.alert(
        'Delete Bot',
        'Are you sure you want to delete this bot? This action cannot be easily undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }, [
      isOwner,
      performDelete,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Commands navigation                                                      */
  /* ------------------------------------------------------------------------ */

  const handleOpenCommands =
    useCallback(() => {
      if (!bot) {
        return;
      }

      if (onOpenCommands) {
        onOpenCommands(bot);
        return;
      }

      if (navigation?.navigate) {
        navigation.navigate(
          'BotCommands',
          {
            botId:
              bot.id || botId,
            bot,
          }
        );
      }
    }, [
      bot,
      botId,
      navigation,
      onOpenCommands,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Back                                                                     */
  /* ------------------------------------------------------------------------ */

  const handleBack =
    useCallback(() => {
      if (
        saving ||
        deleting
      ) {
        return;
      }

      if (navigation?.goBack) {
        navigation.goBack();
      }
    }, [
      deleting,
      navigation,
      saving,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerButton}
          >
            <Text
              style={styles.headerAction}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Edit Bot
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.loadingText}
          >
            Loading bot...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error without bot                                                        */
  /* ------------------------------------------------------------------------ */

  if (!bot) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerButton}
          >
            <Text
              style={styles.headerAction}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Edit Bot
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <View
          style={styles.errorContainer}
        >
          <Text
            style={styles.errorTitle}
          >
            Bot unavailable
          </Text>

          <Text
            style={styles.errorDescription}
          >
            {error ||
              'The requested bot could not be loaded.'}
          </Text>

          <TouchableOpacity
            onPress={loadBot}
            activeOpacity={0.85}
            style={styles.primaryButton}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Main UI                                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            disabled={
              saving || deleting
            }
            style={styles.headerButton}
          >
            <Text
              style={styles.headerAction}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Edit Bot
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={
              saving ||
              deleting ||
              !isOwner
            }
            style={styles.headerButton}
          >
            <Text
              style={[
                styles.headerAction,
                !isOwner &&
                  styles.disabledText,
              ]}
            >
              {saving
                ? 'Saving...'
                : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.botHeader}>
            <View style={styles.botIcon}>
              <Text
                style={styles.botInitial}
              >
                {getInitial(name)}
              </Text>
            </View>

            <View
              style={styles.botHeaderInfo}
            >
              <Text
                numberOfLines={1}
                style={styles.botNamePreview}
              >
                {name || 'Unnamed Bot'}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.botUsername}
              >
                @{bot.username ||
                  'username'}
              </Text>
            </View>
          </View>

          {!isOwner && (
            <View
              style={styles.warningBox}
            >
              <Text
                style={styles.warningTitle}
              >
                Read only
              </Text>

              <Text
                style={styles.warningText}
              >
                You are not the owner of this
                bot, so changes cannot be saved.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              Basic Information
            </Text>

            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Bot Name
                </Text>

                <Text
                  style={styles.counter}
                >
                  {name.length}/
                  {MAX_NAME_LENGTH}
                </Text>
              </View>

              <TextInput
                value={name}
                onChangeText={(value) =>
                  setName(
                    normalizeText(
                      value,
                      MAX_NAME_LENGTH
                    )
                  )
                }
                editable={
                  isOwner &&
                  !saving &&
                  !deleting
                }
                maxLength={
                  MAX_NAME_LENGTH
                }
                placeholder="Bot name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Username
                </Text>

                <Text
                  style={styles.lockedText}
                >
                  Locked
                </Text>
              </View>

              <View
                style={
                  styles.lockedInput
                }
              >
                <Text
                  style={
                    styles.lockedPrefix
                  }
                >
                  @
                </Text>

                <Text
                  numberOfLines={1}
                  style={
                    styles.lockedUsername
                  }
                >
                  {bot.username ||
                    'username'}
                </Text>
              </View>

              <Text
                style={styles.helperText}
              >
                Bot usernames are managed
                separately to prevent accidental
                identity changes.
              </Text>
            </View>

            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Description
                </Text>

                <Text
                  style={styles.counter}
                >
                  {description.length}/
                  {MAX_DESCRIPTION_LENGTH}
                </Text>
              </View>

              <TextInput
                value={description}
                onChangeText={(value) =>
                  setDescription(
                    normalizeText(
                      value,
                      MAX_DESCRIPTION_LENGTH
                    )
                  )
                }
                editable={
                  isOwner &&
                  !saving &&
                  !deleting
                }
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                multiline
                textAlignVertical="top"
                placeholder="Describe what your bot does."
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.descriptionInput,
                ]}
              />
            </View>

            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Welcome Message
                </Text>

                <Text
                  style={styles.counter}
                >
                  {welcomeMessage.length}/
                  {MAX_WELCOME_LENGTH}
                </Text>
              </View>

              <TextInput
                value={welcomeMessage}
                onChangeText={(value) =>
                  setWelcomeMessage(
                    normalizeText(
                      value,
                      MAX_WELCOME_LENGTH
                    )
                  )
                }
                editable={
                  isOwner &&
                  !saving &&
                  !deleting
                }
                maxLength={
                  MAX_WELCOME_LENGTH
                }
                multiline
                textAlignVertical="top"
                placeholder="Message shown when users start the bot."
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.welcomeInput,
                ]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              Bot Controls
            </Text>

            <View
              style={styles.controlCard}
            >
              <View
                style={styles.controlText}
              >
                <Text
                  style={styles.controlTitle}
                >
                  Bot enabled
                </Text>

                <Text
                  style={styles.controlDescription}
                >
                  Turn the bot on or off without
                  deleting its configuration.
                </Text>
              </View>

              <Switch
                value={enabled}
                onValueChange={
                  setEnabled
                }
                disabled={
                  !isOwner ||
                  saving ||
                  deleting
                }
              />
            </View>

            <View
              style={styles.commandCard}
            >
              <View
                style={styles.commandCardText}
              >
                <Text
                  style={styles.controlTitle}
                >
                  Commands
                </Text>

                <Text
                  style={
                    styles.controlDescription
                  }
                >
                  Configure what your bot does
                  when users send commands.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                  handleOpenCommands
                }
                style={
                  styles.manageButton
                }
              >
                <Text
                  style={
                    styles.manageButtonText
                  }
                >
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telegram Bot</Text>
            <View style={styles.commandCard}>
              <View style={styles.commandCardText}>
                <Text style={styles.controlTitle}>Telegram features</Text>
                <Text style={styles.controlDescription}>
                  Connect BotFather token, configure commands, buttons, moderation, AI and the complete Telegram feature set.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TelegramBotFeatures', { botId: bot.id || botId, bot })}
                style={styles.manageButton}
              >
                <Text style={styles.manageButtonText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              Visibility
            </Text>

            {VISIBILITY_OPTIONS.map(
              (option) => {
                const selected =
                  visibility ===
                  option.id;

                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.85}
                    disabled={
                      !isOwner ||
                      saving ||
                      deleting
                    }
                    onPress={() =>
                      setVisibility(
                        option.id
                      )
                    }
                    style={[
                      styles.visibilityOption,
                      selected &&
                        styles.visibilityOptionSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        selected &&
                          styles.radioSelected,
                      ]}
                    >
                      {selected && (
                        <View
                          style={
                            styles.radioDot
                          }
                        />
                      )}
                    </View>

                    <View
                      style={
                        styles.visibilityText
                      }
                    >
                      <Text
                        style={
                          styles.visibilityTitle
                        }
                      >
                        {option.label}
                      </Text>

                      <Text
                        style={
                          styles.visibilityDescription
                        }
                      >
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {!!error && (
            <View
              style={styles.errorBox}
            >
              <Text
                style={styles.errorText}
              >
                {error}
              </Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={
              saving ||
              deleting ||
              !isOwner
            }
            style={[
              styles.saveButton,
              (!isOwner ||
                saving ||
                deleting) &&
                styles.disabledButton,
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Saving...
                </Text>
              </>
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          {isOwner && (
            <View
              style={styles.dangerSection}
            >
              <Text
                style={
                  styles.dangerSectionTitle
                }
              >
                Danger Zone
              </Text>

              <Text
                style={
                  styles.dangerDescription
                }
              >
                Deleting a bot removes it from
                your bot management list.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleDelete}
                disabled={
                  deleting ||
                  saving
                }
                style={[
                  styles.deleteButton,
                  (deleting ||
                    saving) &&
                    styles.disabledDeleteButton,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Delete Bot
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF2',
  },

  headerButton: {
    minWidth: 72,
    minHeight: 42,
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 72,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  headerAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },

  disabledText: {
    color: '#9CA3AF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 50,
  },

  botHeader: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  botIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  botInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3730A3',
  },

  botHeaderInfo: {
    flex: 1,
    marginLeft: 13,
  },

  botNamePreview: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  botUsername: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
  },

  warningBox: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  warningTitle: {
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },

  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#C2410C',
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  field: {
    marginBottom: 18,
  },

  labelRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  counter: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  lockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111827',
  },

  descriptionInput: {
    minHeight: 110,
  },

  welcomeInput: {
    minHeight: 130,
  },

  lockedInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  lockedPrefix: {
    marginRight: 3,
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  lockedUsername: {
    flex: 1,
    fontSize: 15,
    color: '#6B7280',
  },

  helperText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    color: '#9CA3AF',
  },

  controlCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  commandCard: {
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  controlText: {
    flex: 1,
    paddingRight: 12,
  },

  commandCardText: {
    flex: 1,
    paddingRight: 12,
  },

  controlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  controlDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  manageButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  manageButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },

  visibilityOption: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  visibilityOptionSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#F5F3FF',
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: '#4F46E5',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },

  visibilityText: {
    flex: 1,
    marginLeft: 12,
  },

  visibilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  visibilityDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },

  errorBox: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B91C1C',
  },

  saveButton: {
    minHeight: 50,
    borderRadius: 14,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  saveButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.45,
  },

  dangerSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  dangerSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C1C',
  },

  dangerDescription: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  deleteButton: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
  },

  disabledDeleteButton: {
    opacity: 0.5,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  errorContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  errorDescription: {
    maxWidth: 340,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },

  primaryButton: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

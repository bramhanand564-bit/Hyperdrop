// bots/BotCreate.js

import React, {
  useCallback,
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth } from '../firebaseConfig';

import {
  createValidatedBot,
  isBotUsernameAvailable,
} from '../api/BotAPI';

import {
  validateBotContent,
} from '../security/ContentValidator';

import {
  validateBotUsername,
} from '../security/BotValidator';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_NAME_LENGTH = 80;
const MAX_USERNAME_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_WELCOME_LENGTH = 2000;

const DEFAULT_CATEGORY = 'general';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

function normalizeUsername(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\s+/g, '')
    .slice(0, MAX_USERNAME_LENGTH);
}

function normalizeText(
  value = '',
  maxLength
) {
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
    'Something went wrong while creating the bot.'
  );
}

/* -------------------------------------------------------------------------- */
/* BotCreate                                                                  */
/* -------------------------------------------------------------------------- */

export default function BotCreate({
  navigation,
  onCreated,
  onCancel,
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] =
    useState('');

  const [usernameChecking, setUsernameChecking] =
    useState(false);

  const [usernameAvailable, setUsernameAvailable] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState('');

  /* ------------------------------------------------------------------------ */
  /* Derived values                                                           */
  /* ------------------------------------------------------------------------ */

  const currentUserId = getCurrentUserId();

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username]
  );

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      !!currentUserId &&
      name.trim().length > 0 &&
      normalizedUsername.length >= 3 &&
      normalizedUsername.length <=
        MAX_USERNAME_LENGTH
    );
  }, [
    currentUserId,
    name,
    normalizedUsername,
    submitting,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Username availability                                                    */
  /* ------------------------------------------------------------------------ */

  const checkUsername = useCallback(
    async (value) => {
      const normalized =
        normalizeUsername(value);

      setUsernameAvailable(null);

      if (!normalized) {
        return;
      }

      const validation =
        validateBotUsername(normalized);

      if (!validation.valid) {
        return;
      }

      setUsernameChecking(true);

      try {
        const available =
          await isBotUsernameAvailable(
            normalized
          );

        setUsernameAvailable(
          available === true
        );
      } catch (checkError) {
        console.error(
          '[BotCreate] Username check failed:',
          checkError
        );

        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    },
    []
  );

  const handleUsernameChange =
    useCallback(
      (value) => {
        const normalized =
          normalizeUsername(value);

        setUsername(normalized);
        setUsernameAvailable(null);
        setError('');

        if (normalized.length >= 3) {
          checkUsername(normalized);
        }
      },
      [checkUsername]
    );

  /* ------------------------------------------------------------------------ */
  /* Field handlers                                                           */
  /* ------------------------------------------------------------------------ */

  const handleNameChange =
    useCallback((value) => {
      setName(
        normalizeText(
          value,
          MAX_NAME_LENGTH
        )
      );
      setError('');
    }, []);

  const handleDescriptionChange =
    useCallback((value) => {
      setDescription(
        normalizeText(
          value,
          MAX_DESCRIPTION_LENGTH
        )
      );
      setError('');
    }, []);

  const handleWelcomeChange =
    useCallback((value) => {
      setWelcomeMessage(
        normalizeText(
          value,
          MAX_WELCOME_LENGTH
        )
      );
      setError('');
    }, []);

  /* ------------------------------------------------------------------------ */
  /* Validation                                                               */
  /* ------------------------------------------------------------------------ */

  const validateForm = useCallback(() => {
    const errors = [];

    if (!currentUserId) {
      errors.push(
        'You must be signed in to create a bot.'
      );
    }

    if (!name.trim()) {
      errors.push(
        'Bot name is required.'
      );
    }

    if (
      name.trim().length >
      MAX_NAME_LENGTH
    ) {
      errors.push(
        `Bot name must not exceed ${MAX_NAME_LENGTH} characters.`
      );
    }

    const usernameResult =
      validateBotUsername(
        normalizedUsername
      );

    if (!usernameResult.valid) {
      errors.push(
        ...usernameResult.errors
      );
    }

    if (
      description.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      errors.push(
        `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`
      );
    }

    if (
      welcomeMessage.length >
      MAX_WELCOME_LENGTH
    ) {
      errors.push(
        `Welcome message must not exceed ${MAX_WELCOME_LENGTH} characters.`
      );
    }

    const contentResult =
      validateBotContent({
        name,
        username: normalizedUsername,
        description,
        welcomeMessage,
        tags: [],
        commands: [],
        buttons: [],
      });

    if (!contentResult.valid) {
      errors.push(
        ...contentResult.errors
      );
    }

    if (
      usernameAvailable === false
    ) {
      errors.push(
        'This bot username is already taken.'
      );
    }

    return [
      ...new Set(errors),
    ];
  }, [
    currentUserId,
    description,
    name,
    normalizedUsername,
    usernameAvailable,
    welcomeMessage,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Create bot                                                               */
  /* ------------------------------------------------------------------------ */

  const handleCreate = useCallback(
    async () => {
      setError('');

      const errors = validateForm();

      if (errors.length > 0) {
        const message =
          errors.join('\n');

        setError(message);

        Alert.alert(
          'Check your bot',
          message
        );

        return;
      }

      if (!currentUserId) {
        setError(
          'You must be signed in to create a bot.'
        );

        return;
      }

      setSubmitting(true);

      try {
        const botInput = {
          name: name.trim(),
          username: normalizedUsername,
          description:
            description.trim(),
          welcomeMessage:
            welcomeMessage.trim(),

          creatorId: currentUserId,
          ownerId: currentUserId,

          category: DEFAULT_CATEGORY,

          status: 'draft',
          visibility: 'private',

          commands: [],
          buttons: [],
          permissions: [],
          tags: [],

          version: 1,
        };

        const created =
          await createValidatedBot(
            botInput
          );

        if (!created) {
          throw new Error(
            'Bot could not be created.'
          );
        }

        Alert.alert(
          'Bot Created',
          `${created.name || name} has been created successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onCreated) {
                  onCreated(created);
                  return;
                }

                if (
                  navigation?.navigate
                ) {
                  navigation.navigate(
                    'BotEdit',
                    {
                      botId: created.id,
                      bot: created,
                    }
                  );
                }
              },
            },
          ]
        );
      } catch (createError) {
        console.error(
          '[BotCreate] Failed to create bot:',
          createError
        );

        const message =
          getErrorMessage(
            createError
          );

        setError(message);

        Alert.alert(
          'Create Bot Failed',
          message
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      currentUserId,
      description,
      name,
      navigation,
      normalizedUsername,
      onCreated,
      validateForm,
      welcomeMessage,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Cancel                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleCancel = useCallback(
    () => {
      if (submitting) {
        return;
      }

      if (onCancel) {
        onCancel();
        return;
      }

      if (navigation?.goBack) {
        navigation.goBack();
      }
    },
    [
      navigation,
      onCancel,
      submitting,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Username status                                                          */
  /* ------------------------------------------------------------------------ */

  const renderUsernameStatus =
    useMemo(() => {
      if (usernameChecking) {
        return (
          <View style={styles.usernameStatus}>
            <ActivityIndicator size="small" />

            <Text style={styles.checkingText}>
              Checking...
            </Text>
          </View>
        );
      }

      if (
        usernameAvailable === true
      ) {
        return (
          <Text
            style={styles.availableText}
          >
            ✓ Username available
          </Text>
        );
      }

      if (
        usernameAvailable === false
      ) {
        return (
          <Text
            style={styles.unavailableText}
          >
            ✕ Username already taken
          </Text>
        );
      }

      return null;
    }, [
      usernameAvailable,
      usernameChecking,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Sign-in state                                                            */
  /* ------------------------------------------------------------------------ */

  if (!currentUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authRequired}>
          <View style={styles.authIcon}>
            <Text style={styles.authIconText}>
              🤖
            </Text>
          </View>

          <Text style={styles.authTitle}>
            Sign in required
          </Text>

          <Text style={styles.authDescription}>
            You need to sign in before you
            can create a Nax bot.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCancel}
            style={styles.secondaryButton}
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Go Back
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
    <SafeAreaView style={styles.safeArea}>
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
            activeOpacity={0.8}
            onPress={handleCancel}
            disabled={submitting}
            style={styles.headerButton}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Create Bot
          </Text>

          <View
            style={styles.headerButtonSpacer}
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>
                🤖
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              Build your bot
            </Text>

            <Text style={styles.heroDescription}>
              Give your bot a name and
              username. You can add commands,
              buttons and permissions later.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Bot Name
                </Text>

                <Text style={styles.counter}>
                  {name.length}/
                  {MAX_NAME_LENGTH}
                </Text>
              </View>

              <TextInput
                value={name}
                onChangeText={
                  handleNameChange
                }
                placeholder="My Awesome Bot"
                placeholderTextColor="#9CA3AF"
                maxLength={MAX_NAME_LENGTH}
                autoCapitalize="words"
                returnKeyType="next"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Username
                </Text>

                <Text style={styles.counter}>
                  {normalizedUsername.length}/
                  {MAX_USERNAME_LENGTH}
                </Text>
              </View>

              <View
                style={
                  styles.usernameInputContainer
                }
              >
                <Text
                  style={
                    styles.usernamePrefix
                  }
                >
                  @
                </Text>

                <TextInput
                  value={
                    normalizedUsername
                  }
                  onChangeText={
                    handleUsernameChange
                  }
                  placeholder="my_bot"
                  placeholderTextColor="#9CA3AF"
                  maxLength={
                    MAX_USERNAME_LENGTH
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="ascii-capable"
                  returnKeyType="next"
                  style={
                    styles.usernameInput
                  }
                />
              </View>

              {renderUsernameStatus}

              <Text style={styles.helperText}>
                Use lowercase letters,
                numbers and underscores.
              </Text>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Description
                </Text>

                <Text style={styles.counter}>
                  {description.length}/
                  {MAX_DESCRIPTION_LENGTH}
                </Text>
              </View>

              <TextInput
                value={description}
                onChangeText={
                  handleDescriptionChange
                }
                placeholder="What does your bot do?"
                placeholderTextColor="#9CA3AF"
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textarea,
                ]}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Welcome Message
                </Text>

                <Text style={styles.counter}>
                  {welcomeMessage.length}/
                  {MAX_WELCOME_LENGTH}
                </Text>
              </View>

              <TextInput
                value={welcomeMessage}
                onChangeText={
                  handleWelcomeChange
                }
                placeholder="Hello! How can I help you?"
                placeholderTextColor="#9CA3AF"
                maxLength={
                  MAX_WELCOME_LENGTH
                }
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.welcomeTextarea,
                ]}
              />

              <Text style={styles.helperText}>
                Optional. You can change this
                later.
              </Text>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text
                  style={styles.errorText}
                >
                  {error}
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                What's next?
              </Text>

              <Text style={styles.infoText}>
                After creating the bot, you
                can configure commands,
                buttons, permissions and
                publishing settings.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCreate}
              disabled={!canSubmit}
              style={[
                styles.createButton,
                !canSubmit &&
                  styles.createButtonDisabled,
              ]}
            >
              {submitting ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={
                      styles.createButtonText
                    }
                  >
                    Creating...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Create Bot
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    minWidth: 70,
    minHeight: 40,
    justifyContent: 'center',
  },

  headerButtonSpacer: {
    width: 70,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },

  heroIcon: {
    width: 76,
    height: 76,
    marginBottom: 16,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  heroIconText: {
    fontSize: 36,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  heroDescription: {
    maxWidth: 360,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },

  form: {
    width: '100%',
  },

  field: {
    marginBottom: 20,
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

  textarea: {
    minHeight: 110,
  },

  welcomeTextarea: {
    minHeight: 130,
  },

  usernameInputContainer: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  usernamePrefix: {
    marginRight: 2,
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },

  usernameInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },

  usernameStatus: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkingText: {
    marginLeft: 7,
    fontSize: 12,
    color: '#6B7280',
  },

  availableText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },

  unavailableText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },

  helperText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    color: '#9CA3AF',
  },

  errorBox: {
    marginBottom: 16,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B91C1C',
  },

  infoBox: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },

  infoTitle: {
    marginBottom: 5,
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  createButton: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  createButtonDisabled: {
    opacity: 0.45,
  },

  createButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  authRequired: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  authIcon: {
    width: 76,
    height: 76,
    marginBottom: 18,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  authIconText: {
    fontSize: 34,
  },

  authTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  authDescription: {
    maxWidth: 340,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },

  secondaryButton: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});

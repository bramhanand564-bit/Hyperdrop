// bots/BotCommands.js

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
  Modal,
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
} from '../api/BotAPI';

import {
  validateBotCommand,
  normalizeCommandName,
} from '../security/BotValidator';

import {
  validateMessage,
  sanitizeText,
} from '../security/ContentValidator';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_COMMANDS = 100;
const MAX_COMMAND_NAME = 32;
const MAX_DESCRIPTION = 200;
const MAX_RESPONSE = 5000;

const RESPONSE_TYPES = [
  {
    id: 'text',
    label: 'Text',
    description: 'Send a text response.',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    description: 'Reply with interactive buttons.',
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Reply with a link.',
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

function getBotIdFromProps({
  route,
  botId,
  bot,
}) {
  return (
    botId ||
    route?.params?.botId ||
    bot?.id ||
    route?.params?.bot?.id ||
    null
  );
}

function normalizeDescription(
  value = ''
) {
  return sanitizeText(value, {
    maxLength: MAX_DESCRIPTION,
    collapseWhitespace: true,
  });
}

function normalizeResponse(
  value = ''
) {
  return sanitizeText(value, {
    maxLength: MAX_RESPONSE,
  });
}

function createCommand() {
  return {
    id: `command_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    name: '',

    description: '',

    response: '',

    responseType: 'text',

    buttons: [],

    enabled: true,
  };
}

function getCommandId(command, index) {
  return String(
    command?.id ||
      command?.name ||
      `command_${index}`
  );
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

/* -------------------------------------------------------------------------- */
/* CommandCard                                                                */
/* -------------------------------------------------------------------------- */

function CommandCard({
  command,
  index,
  onEdit,
  onDelete,
  onToggle,
}) {
  const commandName =
    normalizeCommandName(
      command?.name
    );

  const displayName = commandName
    ? `/${commandName}`
    : '/unnamed';

  const responseType =
    RESPONSE_TYPES.find(
      (item) =>
        item.id ===
        command?.responseType
    );

  return (
    <View
      style={[
        styles.commandCard,
        command?.enabled === false &&
          styles.commandCardDisabled,
      ]}
    >
      <View style={styles.commandTopRow}>
        <View
          style={styles.commandIcon}
        >
          <Text
            style={styles.commandIconText}
          >
            /
          </Text>
        </View>

        <View
          style={styles.commandMain}
        >
          <View
            style={styles.commandTitleRow}
          >
            <Text
              numberOfLines={1}
              style={styles.commandName}
            >
              {displayName}
            </Text>

            <View
              style={styles.typeBadge}
            >
              <Text
                style={styles.typeBadgeText}
              >
                {responseType?.label ||
                  'Text'}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={styles.commandDescription}
          >
            {command?.description ||
              'No description'}
          </Text>
        </View>

        <Switch
          value={
            command?.enabled !== false
          }
          onValueChange={() =>
            onToggle?.(command)
          }
        />
      </View>

      <View
        style={styles.responsePreview}
      >
        <Text
          numberOfLines={3}
          style={styles.responseText}
        >
          {command?.response ||
            'No response configured.'}
        </Text>
      </View>

      <View
        style={styles.commandActions}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            onEdit?.(command)
          }
          style={styles.editButton}
        >
          <Text
            style={styles.editButtonText}
          >
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            onDelete?.(command)
          }
          style={styles.deleteSmallButton}
        >
          <Text
            style={styles.deleteSmallButtonText}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* CommandEditor                                                              */
/* -------------------------------------------------------------------------- */

function CommandEditor({
  visible,
  command,
  onClose,
  onSave,
}) {
  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [response, setResponse] =
    useState('');

  const [responseType, setResponseType] =
    useState('text');

  const [enabled, setEnabled] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(
      normalizeCommandName(
        command?.name || ''
      )
    );

    setDescription(
      normalizeDescription(
        command?.description || ''
      )
    );

    setResponse(
      normalizeResponse(
        command?.response || ''
      )
    );

    setResponseType(
      RESPONSE_TYPES.some(
        (item) =>
          item.id ===
          command?.responseType
      )
        ? command.responseType
        : 'text'
    );

    setEnabled(
      command?.enabled !== false
    );

    setError('');
  }, [
    command,
    visible,
  ]);

  const handleNameChange =
    useCallback((value) => {
      setName(
        normalizeCommandName(value)
      );
      setError('');
    }, []);

  const handleDescriptionChange =
    useCallback((value) => {
      setDescription(
        normalizeDescription(value)
      );
      setError('');
    }, []);

  const handleResponseChange =
    useCallback((value) => {
      setResponse(
        normalizeResponse(value)
      );
      setError('');
    }, []);

  const handleSave =
    useCallback(() => {
      const normalizedCommand = {
        ...(command || {}),
        name: name.trim(),
        description:
          description.trim(),
        response: response.trim(),
        responseType,
        buttons:
          Array.isArray(
            command?.buttons
          )
            ? command.buttons
            : [],
        enabled,
      };

      const commandResult =
        validateBotCommand(
          normalizedCommand
        );

      const responseResult =
        validateMessage(
          response,
          'Command response'
        );

      const errors = [
        ...commandResult.errors,
        ...responseResult.errors,
      ];

      if (
        responseType === 'link' &&
        !response.trim()
      ) {
        errors.push(
          'Link response requires a URL.'
        );
      }

      if (errors.length > 0) {
        setError(
          [
            ...new Set(errors),
          ].join('\n')
        );

        return;
      }

      onSave?.(
        normalizedCommand
      );
    }, [
      command,
      description,
      enabled,
      name,
      onSave,
      response,
      responseType,
    ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.modalSafeArea}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={styles.modalHeader}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalHeaderButton}
            >
              <Text
                style={styles.modalCancelText}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Text
              style={styles.modalTitle}
            >
              {command
                ? 'Edit Command'
                : 'Add Command'}
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              style={styles.modalHeaderButton}
            >
              <Text
                style={styles.modalSaveText}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.modalContent
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Command
                </Text>

                <Text
                  style={styles.counter}
                >
                  {name.length}/
                  {MAX_COMMAND_NAME}
                </Text>
              </View>

              <View
                style={styles.commandInput}
              >
                <Text
                  style={styles.commandPrefix}
                >
                  /
                </Text>

                <TextInput
                  value={name}
                  onChangeText={
                    handleNameChange
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={
                    MAX_COMMAND_NAME
                  }
                  placeholder="start"
                  placeholderTextColor="#9CA3AF"
                  style={
                    styles.commandNameInput
                  }
                />
              </View>

              <Text
                style={styles.helperText}
              >
                Use lowercase letters,
                numbers and underscores.
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
                  {MAX_DESCRIPTION}
                </Text>
              </View>

              <TextInput
                value={description}
                onChangeText={
                  handleDescriptionChange
                }
                maxLength={
                  MAX_DESCRIPTION
                }
                placeholder="What does this command do?"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={styles.label}
              >
                Response Type
              </Text>

              <View
                style={
                  styles.responseTypeList
                }
              >
                {RESPONSE_TYPES.map(
                  (type) => {
                    const selected =
                      responseType ===
                      type.id;

                    return (
                      <TouchableOpacity
                        key={type.id}
                        activeOpacity={0.8}
                        onPress={() =>
                          setResponseType(
                            type.id
                          )
                        }
                        style={[
                          styles.responseTypeOption,
                          selected &&
                            styles.responseTypeSelected,
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
                            styles.responseTypeText
                          }
                        >
                          <Text
                            style={
                              styles.responseTypeTitle
                            }
                          >
                            {type.label}
                          </Text>

                          <Text
                            style={
                              styles.responseTypeDescription
                            }
                          >
                            {
                              type.description
                            }
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>

            <View style={styles.field}>
              <View
                style={styles.labelRow}
              >
                <Text
                  style={styles.label}
                >
                  Response
                </Text>

                <Text
                  style={styles.counter}
                >
                  {response.length}/
                  {MAX_RESPONSE}
                </Text>
              </View>

              <TextInput
                value={response}
                onChangeText={
                  handleResponseChange
                }
                maxLength={
                  MAX_RESPONSE
                }
                multiline
                textAlignVertical="top"
                placeholder={
                  responseType ===
                  'link'
                    ? 'https://example.com'
                    : 'Write the response users will receive...'
                }
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.responseInput,
                ]}
              />

              {responseType ===
                'link' && (
                <Text
                  style={styles.helperText}
                >
                  Only safe HTTPS links
                  should be used.
                </Text>
              )}
            </View>

            <View
              style={styles.enabledCard}
            >
              <View
                style={styles.enabledText}
              >
                <Text
                  style={styles.enabledTitle}
                >
                  Command enabled
                </Text>

                <Text
                  style={
                    styles.enabledDescription
                  }
                >
                  Disabled commands stay
                  saved but won't run.
                </Text>
              </View>

              <Switch
                value={enabled}
                onValueChange={setEnabled}
              />
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
              style={styles.fullSaveButton}
            >
              <Text
                style={styles.fullSaveButtonText}
              >
                {command
                  ? 'Save Command'
                  : 'Add Command'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* BotCommands                                                                */
/* -------------------------------------------------------------------------- */

export default function BotCommands({
  navigation,
  route,
  botId: directBotId,
  bot: directBot,
  onSaved,
}) {
  const botId =
    getBotIdFromProps({
      route,
      botId: directBotId,
      bot: directBot,
    });

  const [bot, setBot] =
    useState(directBot || null);

  const [commands, setCommands] =
    useState(
      Array.isArray(
        directBot?.commands
      )
        ? directBot.commands
        : []
    );

  const [loading, setLoading] =
    useState(!directBot);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [editorVisible, setEditorVisible] =
    useState(false);

  const [editingCommand, setEditingCommand] =
    useState(null);

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

        setCommands(
          Array.isArray(
            loadedBot.commands
          )
            ? loadedBot.commands
            : []
        );
      } catch (loadError) {
        console.error(
          '[BotCommands] Failed to load bot:',
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
    if (!directBot) {
      loadBot();
    }
  }, [
    directBot,
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
  /* Open editor                                                              */
  /* ------------------------------------------------------------------------ */

  const openCreateEditor =
    useCallback(() => {
      if (!isOwner) {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to edit this bot.'
        );

        return;
      }

      if (
        commands.length >=
        MAX_COMMANDS
      ) {
        Alert.alert(
          'Command Limit',
          `A bot can have up to ${MAX_COMMANDS} commands.`
        );

        return;
      }

      setEditingCommand(null);
      setEditorVisible(true);
    }, [
      commands.length,
      isOwner,
    ]);

  const openEditEditor =
    useCallback(
      (command) => {
        if (!isOwner) {
          Alert.alert(
            'Permission Denied',
            'You do not have permission to edit this bot.'
          );

          return;
        }

        setEditingCommand(command);
        setEditorVisible(true);
      },
      [isOwner]
    );

  const closeEditor =
    useCallback(() => {
      if (saving) {
        return;
      }

      setEditorVisible(false);
      setEditingCommand(null);
    }, [saving]);

  /* ------------------------------------------------------------------------ */
  /* Save commands                                                            */
  /* ------------------------------------------------------------------------ */

  const saveCommands =
    useCallback(
      async (nextCommands) => {
        if (!bot || !botId) {
          throw new Error(
            'Bot data is unavailable.'
          );
        }

        if (!currentUserId) {
          throw new Error(
            'You must be signed in.'
          );
        }

        if (!isOwner) {
          throw new Error(
            'You do not have permission to edit this bot.'
          );
        }

        if (
          nextCommands.length >
          MAX_COMMANDS
        ) {
          throw new Error(
            `A bot can have up to ${MAX_COMMANDS} commands.`
          );
        }

        const normalizedCommands =
          nextCommands.map(
            (command) => ({
              ...command,

              name:
                normalizeCommandName(
                  command.name
                ),

              description:
                normalizeDescription(
                  command.description
                ),

              response:
                normalizeResponse(
                  command.response
                ),

              responseType:
                RESPONSE_TYPES.some(
                  (item) =>
                    item.id ===
                    command.responseType
                )
                  ? command.responseType
                  : 'text',

              buttons:
                Array.isArray(
                  command.buttons
                )
                  ? command.buttons
                  : [],

              enabled:
                command.enabled !== false,
            })
          );

        const errors = [];

        normalizedCommands.forEach(
          (command, index) => {
            const result =
              validateBotCommand(
                command
              );

            result.errors.forEach(
              (validationError) => {
                errors.push(
                  `Command ${
                    index + 1
                  }: ${validationError}`
                );
              }
            );
          }
        );

        const names = new Set();

        normalizedCommands.forEach(
          (command) => {
            if (!command.name) {
              return;
            }

            if (
              names.has(command.name)
            ) {
              errors.push(
                `Duplicate command: /${command.name}`
              );
            }

            names.add(command.name);
          }
        );

        if (errors.length > 0) {
          throw new Error(
            [
              ...new Set(errors),
            ].join('\n')
          );
        }

        setSaving(true);
        setError('');

        const updated =
          await updateValidatedBot(
            botId,
            {
              ...bot,
              commands:
                normalizedCommands,
            }
          );

        if (!updated) {
          throw new Error(
            'Commands could not be saved.'
          );
        }

        setBot(updated);

        setCommands(
          Array.isArray(
            updated.commands
          )
            ? updated.commands
            : normalizedCommands
        );

        if (onSaved) {
          onSaved(updated);
        }

        return updated;
      },
      [
        bot,
        botId,
        currentUserId,
        isOwner,
        onSaved,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Add / update command                                                     */
  /* ------------------------------------------------------------------------ */

  const handleEditorSave =
    useCallback(
      async (command) => {
        try {
          const exists =
            commands.some(
              (item) =>
                getCommandId(item, 0) ===
                getCommandId(command, 0)
            );

          let nextCommands;

          if (editingCommand) {
            nextCommands =
              commands.map(
                (item) =>
                  getCommandId(
                    item,
                    0
                  ) ===
                  getCommandId(
                    editingCommand,
                    0
                  )
                    ? {
                        ...command,
                        id:
                          item.id ||
                          editingCommand.id,
                      }
                    : item
              );
          } else {
            nextCommands = [
              ...commands,
              {
                ...command,
                id:
                  command.id ||
                  `command_${Date.now()}`,
              },
            ];
          }

          if (
            !editingCommand &&
            exists
          ) {
            throw new Error(
              'A command with this name already exists.'
            );
          }

          await saveCommands(
            nextCommands
          );

          setEditorVisible(false);
          setEditingCommand(null);

          Alert.alert(
            'Saved',
            'Command saved successfully.'
          );
        } catch (saveError) {
          console.error(
            '[BotCommands] Failed to save command:',
            saveError
          );

          const message =
            getErrorMessage(
              saveError
            );

          setError(message);

          Alert.alert(
            'Save Failed',
            message
          );
        } finally {
          setSaving(false);
        }
      },
      [
        commands,
        editingCommand,
        saveCommands,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Delete command                                                           */
  /* ------------------------------------------------------------------------ */

  const handleDelete =
    useCallback(
      (command) => {
        if (!isOwner) {
          Alert.alert(
            'Permission Denied',
            'You do not have permission to edit this bot.'
          );

          return;
        }

        const commandName =
          normalizeCommandName(
            command?.name
          );

        Alert.alert(
          'Delete Command',
          `Delete /${
            commandName ||
            'this command'
          }?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  const targetId =
                    getCommandId(
                      command,
                      0
                    );

                  const nextCommands =
                    commands.filter(
                      (item, index) =>
                        getCommandId(
                          item,
                          index
                        ) !==
                        targetId
                    );

                  await saveCommands(
                    nextCommands
                  );

                  Alert.alert(
                    'Deleted',
                    'Command deleted successfully.'
                  );
                } catch (
                  deleteError
                ) {
                  console.error(
                    '[BotCommands] Failed to delete command:',
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
                  setSaving(false);
                }
              },
            },
          ]
        );
      },
      [
        commands,
        isOwner,
        saveCommands,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Toggle command                                                           */
  /* ------------------------------------------------------------------------ */

  const handleToggle =
    useCallback(
      async (command) => {
        if (!isOwner || saving) {
          return;
        }

        const targetId =
          getCommandId(
            command,
            0
          );

        const nextCommands =
          commands.map(
            (item, index) =>
              getCommandId(
                item,
                index
              ) === targetId
                ? {
                    ...item,
                    enabled:
                      item.enabled ===
                      false,
                  }
                : item
          );

        try {
          await saveCommands(
            nextCommands
          );
        } catch (toggleError) {
          console.error(
            '[BotCommands] Failed to toggle command:',
            toggleError
          );

          const message =
            getErrorMessage(
              toggleError
            );

          setError(message);

          Alert.alert(
            'Update Failed',
            message
          );
        } finally {
          setSaving(false);
        }
      },
      [
        commands,
        isOwner,
        saving,
        saveCommands,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Back                                                                     */
  /* ------------------------------------------------------------------------ */

  const handleBack =
    useCallback(() => {
      if (saving) {
        return;
      }

      if (navigation?.goBack) {
        navigation.goBack();
      }
    }, [
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
            Commands
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
            Loading commands...
          </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          disabled={saving}
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
          Commands
        </Text>

        <TouchableOpacity
          onPress={openCreateEditor}
          disabled={
            saving || !isOwner
          }
          style={styles.headerButton}
        >
          <Text
            style={[
              styles.headerAction,
              (!isOwner || saving) &&
                styles.disabledText,
            ]}
          >
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.summaryCard}
        >
          <View
            style={styles.summaryIcon}
          >
            <Text
              style={styles.summaryIconText}
            >
              /
            </Text>
          </View>

          <View
            style={styles.summaryText}
          >
            <Text
              style={styles.summaryTitle}
            >
              Bot Commands
            </Text>

            <Text
              style={styles.summaryDescription}
            >
              {commands.length} of{' '}
              {MAX_COMMANDS} commands
              configured.
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
              bot, so commands cannot be
              changed.
            </Text>
          </View>
        )}

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

        {commands.length === 0 ? (
          <View
            style={styles.emptyState}
          >
            <View
              style={styles.emptyIcon}
            >
              <Text
                style={styles.emptyIconText}
              >
                /
              </Text>
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No commands yet
            </Text>

            <Text
              style={styles.emptyDescription}
            >
              Add commands to define how
              your bot responds to users.
            </Text>

            {isOwner && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                  openCreateEditor
                }
                style={
                  styles.primaryButton
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Add First Command
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          commands.map(
            (command, index) => (
              <CommandCard
                key={getCommandId(
                  command,
                  index
                )}
                command={command}
                index={index}
                onEdit={
                  openEditEditor
                }
                onDelete={
                  handleDelete
                }
                onToggle={
                  handleToggle
                }
              />
            )
          )
        )}

        <Text
          style={styles.bottomHint}
        >
          Commands are validated before
          being saved. Server-side security
          rules should still be enforced.
        </Text>
      </ScrollView>

      <CommandEditor
        visible={editorVisible}
        command={editingCommand}
        onClose={closeEditor}
        onSave={handleEditorSave}
      />

      {saving && (
        <View
          style={styles.savingOverlay}
          pointerEvents="none"
        >
          <View
            style={styles.savingCard}
          >
            <ActivityIndicator
              size="small"
            />

            <Text
              style={styles.savingText}
            >
              Saving...
            </Text>
          </View>
        </View>
      )}
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

  modalSafeArea: {
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 45,
  },

  summaryCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  summaryIconText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#4338CA',
  },

  summaryText: {
    flex: 1,
    marginLeft: 13,
  },

  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  summaryDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },

  warningBox: {
    marginBottom: 16,
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

  commandCard: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  commandCardDisabled: {
    opacity: 0.62,
  },

  commandTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  commandIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  commandIconText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#374151',
  },

  commandMain: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    marginRight: 8,
  },

  commandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commandName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  typeBadge: {
    marginLeft: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#EEF2FF',
  },

  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
  },

  commandDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },

  responsePreview: {
    marginTop: 13,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#F9FAFB',
  },

  responseText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },

  commandActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  editButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },

  deleteSmallButton: {
    minHeight: 36,
    marginLeft: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

  deleteSmallButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },

  emptyState: {
    minHeight: 330,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 68,
    height: 68,
    marginBottom: 17,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  emptyIconText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4338CA',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  emptyDescription: {
    maxWidth: 340,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },

  primaryButton: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  bottomHint: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: '#9CA3AF',
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

  modalHeader: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF2',
  },

  modalHeaderButton: {
    minWidth: 72,
    minHeight: 42,
    justifyContent: 'center',
  },

  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  modalSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
    textAlign: 'right',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 45,
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
    marginBottom: 8,
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

  commandInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  commandPrefix: {
    marginRight: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#6B7280',
  },

  commandNameInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },

  helperText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    color: '#9CA3AF',
  },

  responseTypeList: {
    marginTop: 4,
  },

  responseTypeOption: {
    marginBottom: 9,
    padding: 13,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  responseTypeSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#A5B4FC',
  },

  radio: {
    width: 21,
    height: 21,
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
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },

  responseTypeText: {
    flex: 1,
    marginLeft: 11,
  },

  responseTypeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  responseTypeDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#6B7280',
  },

  responseInput: {
    minHeight: 140,
  },

  enabledCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  enabledText: {
    flex: 1,
    paddingRight: 12,
  },

  enabledTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  enabledDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },

  fullSaveButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  fullSaveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    pointerEvents: 'none',
  },

  savingCard: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  savingText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
});

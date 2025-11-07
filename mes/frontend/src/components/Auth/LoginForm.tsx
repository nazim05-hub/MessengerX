import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Неверный email'),
      password: (value) => (value.length >= 6 ? null : 'Пароль должен быть минимум 6 символов'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const tokens = await authApi.login(values);
      const user = await authApi.getMe();
      
      login(tokens.access_token, tokens.refresh_token, user);
      
      notifications.show({
        title: 'Успешно',
        message: 'Вы вошли в систему',
        color: 'green',
      });
      
      navigate('/');
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Ошибка входа',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb="md">
        Вход
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Еще нет аккаунта?{' '}
        <Anchor size="sm" onClick={() => navigate('/register')}>
          Зарегистрироваться
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Пароль"
            placeholder="Ваш пароль"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Войти
          </Button>
        </form>
      </Paper>
    </Container>
  );
}


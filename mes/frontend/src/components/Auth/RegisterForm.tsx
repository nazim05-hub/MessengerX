import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      full_name: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Неверный email'),
      username: (value) => (value.length >= 3 ? null : 'Имя пользователя должно быть минимум 3 символа'),
      password: (value) => (value.length >= 6 ? null : 'Пароль должен быть минимум 6 символов'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Пароли не совпадают',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await authApi.register({
        email: values.email,
        username: values.username,
        password: values.password,
        full_name: values.full_name || undefined,
      });
      
      notifications.show({
        title: 'Успешно',
        message: 'Регистрация завершена. Проверьте email для подтверждения.',
        color: 'green',
      });
      
      navigate('/login');
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Ошибка регистрации',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb="md">
        Регистрация
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Уже есть аккаунт?{' '}
        <Anchor size="sm" onClick={() => navigate('/login')}>
          Войти
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
          <TextInput
            label="Имя пользователя"
            placeholder="username"
            required
            mt="md"
            {...form.getInputProps('username')}
          />
          <TextInput
            label="Полное имя"
            placeholder="Иван Иванов"
            mt="md"
            {...form.getInputProps('full_name')}
          />
          <PasswordInput
            label="Пароль"
            placeholder="Ваш пароль"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Подтвердите пароль"
            placeholder="Повторите пароль"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Зарегистрироваться
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

